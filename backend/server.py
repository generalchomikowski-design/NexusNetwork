from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Stripe
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

# JWT
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24

# Admin seed
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

app = FastAPI(title="Nexus Network API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ====== MODELS ======

class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # hosting | addons | maps
    name: str
    price: float  # PLN
    old_price: Optional[float] = None
    promo_label: Optional[str] = None  # e.g. "-50%"
    description: Optional[str] = None
    specs: List[str] = Field(default_factory=list)
    featured: bool = False
    sort_order: int = 0
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PackageCreate(BaseModel):
    category: str
    name: str
    price: float
    old_price: Optional[float] = None
    promo_label: Optional[str] = None
    description: Optional[str] = None
    specs: List[str] = Field(default_factory=list)
    featured: bool = False
    sort_order: int = 0
    active: bool = True


class PackageUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    old_price: Optional[float] = None
    promo_label: Optional[str] = None
    description: Optional[str] = None
    specs: Optional[List[str]] = None
    featured: Optional[bool] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str


class CheckoutCreate(BaseModel):
    package_id: str
    origin_url: str
    customer_email: Optional[EmailStr] = None
    server_name: Optional[str] = None


class CheckoutCreateResponse(BaseModel):
    url: str
    session_id: str


class CheckoutStatusOut(BaseModel):
    session_id: str
    status: str
    payment_status: str
    amount_total: float
    currency: str
    package_name: Optional[str] = None


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str


class TransactionOut(BaseModel):
    id: str
    session_id: str
    package_id: str
    package_name: str
    amount: float
    currency: str
    status: str
    payment_status: str
    customer_email: Optional[str] = None
    server_name: Optional[str] = None
    created_at: str


# ====== HELPERS ======

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt(email: str) -> str:
    payload = {
        "sub": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Brak autoryzacji")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Niepoprawny token")
        admin = await db.admins.find_one({"email": email}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Niepoprawne konto admina")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token wygasł")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Niepoprawny token")


def doc_to_package(doc: Dict) -> Package:
    if isinstance(doc.get("created_at"), str):
        try:
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        except Exception:
            doc["created_at"] = datetime.now(timezone.utc)
    return Package(**doc)


# ====== PACKAGE ROUTES (public) ======

@api_router.get("/packages", response_model=List[Package])
async def list_packages(category: Optional[str] = None, active_only: bool = True):
    query: Dict = {}
    if category:
        query["category"] = category
    if active_only:
        query["active"] = True
    docs = await db.packages.find(query, {"_id": 0}).sort([("sort_order", 1), ("price", 1)]).to_list(500)
    return [doc_to_package(d) for d in docs]


@api_router.get("/packages/{package_id}", response_model=Package)
async def get_package(package_id: str):
    doc = await db.packages.find_one({"id": package_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pakiet nie znaleziony")
    return doc_to_package(doc)


# ====== ADMIN AUTH ======

@api_router.post("/admin/login", response_model=AuthResponse)
async def admin_login(payload: AdminLogin):
    admin = await db.admins.find_one({"email": payload.email}, {"_id": 0})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Niepoprawny email lub hasło")
    return AuthResponse(token=create_jwt(admin["email"]), email=admin["email"])


@api_router.get("/admin/me")
async def admin_me(email: str = Depends(require_admin)):
    return {"email": email}


# ====== ADMIN PACKAGE CRUD ======

@api_router.post("/admin/packages", response_model=Package)
async def admin_create_package(payload: PackageCreate, _: str = Depends(require_admin)):
    pkg = Package(**payload.model_dump())
    doc = pkg.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.packages.insert_one(doc)
    return pkg


@api_router.put("/admin/packages/{package_id}", response_model=Package)
async def admin_update_package(package_id: str, payload: PackageUpdate, _: str = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")
    result = await db.packages.update_one({"id": package_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pakiet nie znaleziony")
    doc = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return doc_to_package(doc)


@api_router.delete("/admin/packages/{package_id}")
async def admin_delete_package(package_id: str, _: str = Depends(require_admin)):
    result = await db.packages.delete_one({"id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pakiet nie znaleziony")
    return {"ok": True}


@api_router.get("/admin/transactions", response_model=List[TransactionOut])
async def admin_list_transactions(_: str = Depends(require_admin)):
    docs = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        out.append(TransactionOut(
            id=d.get("id", ""),
            session_id=d.get("session_id", ""),
            package_id=d.get("package_id", ""),
            package_name=d.get("package_name", ""),
            amount=float(d.get("amount", 0)),
            currency=d.get("currency", "pln"),
            status=d.get("status", "unknown"),
            payment_status=d.get("payment_status", "unknown"),
            customer_email=d.get("customer_email"),
            server_name=d.get("server_name"),
            created_at=d.get("created_at", ""),
        ))
    return out


@api_router.get("/admin/contacts")
async def admin_list_contacts(_: str = Depends(require_admin)):
    docs = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


# ====== STRIPE CHECKOUT ======

@api_router.post("/checkout/create", response_model=CheckoutCreateResponse)
async def create_checkout(payload: CheckoutCreate, request: Request):
    pkg_doc = await db.packages.find_one({"id": payload.package_id, "active": True}, {"_id": 0})
    if not pkg_doc:
        raise HTTPException(status_code=404, detail="Pakiet nie znaleziony")

    # Amount/currency are taken from server-side package definition only
    amount = float(pkg_doc["price"])
    currency = "pln"

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/platnosc/sukces?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/platnosc/anulowane"

    metadata = {
        "package_id": pkg_doc["id"],
        "package_name": pkg_doc["name"],
        "category": pkg_doc["category"],
        "source": "nexus_landing",
    }
    if payload.customer_email:
        metadata["customer_email"] = str(payload.customer_email)
    if payload.server_name:
        metadata["server_name"] = payload.server_name

    req = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)
    except Exception as e:
        logging.exception("Stripe checkout creation failed")
        raise HTTPException(status_code=500, detail=f"Błąd Stripe: {str(e)}")

    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "package_id": pkg_doc["id"],
        "package_name": pkg_doc["name"],
        "category": pkg_doc["category"],
        "amount": amount,
        "currency": currency,
        "status": "initiated",
        "payment_status": "pending",
        "metadata": metadata,
        "customer_email": payload.customer_email,
        "server_name": payload.server_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(transaction_doc)

    return CheckoutCreateResponse(url=session.url, session_id=session.session_id)


@api_router.get("/checkout/status/{session_id}", response_model=CheckoutStatusOut)
async def checkout_status(session_id: str, request: Request):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transakcja nie znaleziona")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    # Try to fetch latest status from Stripe; fall back to DB state on any
    # Stripe API hiccup (e.g. session not yet propagated through proxy).
    try:
        status_resp: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        already_paid = txn.get("payment_status") == "paid"
        new_status = status_resp.status
        new_payment_status = status_resp.payment_status

        if not already_paid:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": new_status,
                    "payment_status": new_payment_status,
                    "amount_total_cents": status_resp.amount_total,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )

        amount_total = status_resp.amount_total / 100 if status_resp.amount_total else float(txn.get("amount", 0))
        return CheckoutStatusOut(
            session_id=session_id,
            status=new_status,
            payment_status=new_payment_status,
            amount_total=amount_total,
            currency=status_resp.currency or txn.get("currency", "pln"),
            package_name=txn.get("package_name"),
        )
    except Exception as e:
        logging.warning(f"Stripe status fetch failed for {session_id}: {e}; falling back to DB state")
        return CheckoutStatusOut(
            session_id=session_id,
            status=txn.get("status", "initiated"),
            payment_status=txn.get("payment_status", "pending"),
            amount_total=float(txn.get("amount", 0)),
            currency=txn.get("currency", "pln"),
            package_name=txn.get("package_name"),
        )


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        evt = await stripe_checkout.handle_webhook(body, signature)
    except Exception as e:
        logging.exception("Webhook handling failed")
        raise HTTPException(status_code=400, detail=str(e))

    if evt and getattr(evt, "session_id", None):
        existing = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
        if existing and existing.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": evt.session_id},
                {"$set": {
                    "payment_status": evt.payment_status,
                    "status": "completed" if evt.payment_status == "paid" else existing.get("status", "pending"),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
    return {"received": True}


# ====== CONTACT ======

@api_router.post("/contact")
async def submit_contact(payload: ContactCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": str(payload.email),
        "subject": payload.subject,
        "message": payload.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contacts.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


# ====== ROOT ======

@api_router.get("/")
async def root():
    return {"message": "Nexus Network API", "status": "online"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ====== SEED DATA ======

DEFAULT_PACKAGES: List[Dict] = [
    # Hosting
    {
        "category": "hosting", "name": "Basic", "price": 25.0, "old_price": 50.0, "promo_label": "-50%",
        "description": "Idealny start dla małego serwera GMod.",
        "specs": ["6GB RAM", "80GB SSD", "2.0 vCore CPU", "Podstawowa paczka addonów", "Ochrona Anti-DDoS"],
        "featured": False, "sort_order": 1,
    },
    {
        "category": "hosting", "name": "Normal", "price": 30.0, "old_price": 60.0, "promo_label": "-50%",
        "description": "Wydajny pakiet z 24/7 wsparciem.",
        "specs": ["8GB RAM", "120GB SSD", "3.0 vCore CPU", "Normalna paczka addonów", "Ochrona Anti-DDoS", "Wsparcie 24/7", "Gotowe configi"],
        "featured": False, "sort_order": 2,
    },
    {
        "category": "hosting", "name": "Pro", "price": 35.0, "old_price": 70.0, "promo_label": "-50%",
        "description": "Najpopularniejszy wybór wśród społeczności.",
        "specs": ["8GB RAM", "120GB SSD", "3.0 vCore CPU", "Rozszerzona paczka addonów", "Ochrona Anti-DDoS", "Wsparcie 24/7", "Gotowe configi", "Własna paczka modyfikacji"],
        "featured": True, "sort_order": 3,
    },
    {
        "category": "hosting", "name": "VIP", "price": 100.0, "old_price": None, "promo_label": None,
        "description": "Maksymalna moc dla dużych społeczności.",
        "specs": ["24GB RAM", "200GB SSD", "3.0 vCore CPU", "Rozszerzona paczka addonów", "Ochrona Anti-DDoS", "Wsparcie 24/7", "Gotowe configi", "Własna paczka modyfikacji"],
        "featured": False, "sort_order": 4,
    },
    # Addony – wkrótce (brak aktywnych pakietów; admin może dodać)
    # Mapy
    {
        "category": "maps", "name": "Mała", "price": 15.0, "old_price": None, "promo_label": None,
        "description": "Kompaktowa autorska mapa – idealna dla małej społeczności.",
        "specs": ["Do ~32 graczy", "Pełna optymalizacja", "Customowe textury", "Instalacja zdalna"],
        "featured": False, "sort_order": 1,
    },
    {
        "category": "maps", "name": "Średnia", "price": 20.0, "old_price": None, "promo_label": None,
        "description": "Wszechstronna mapa średniej wielkości pod różne tryby.",
        "specs": ["Do ~64 graczy", "Strefy biznesowe i mieszkalne", "Dynamiczne oświetlenie HD", "Instalacja zdalna"],
        "featured": True, "sort_order": 2,
    },
    {
        "category": "maps", "name": "Duża", "price": 30.0, "old_price": None, "promo_label": None,
        "description": "Rozległa mapa dla dużych serwerów i pełnego roleplay.",
        "specs": ["Do ~200 graczy", "Pełne miasto", "Sekretne przejścia i ukryte strefy", "Pełna optymalizacja", "Instalacja zdalna"],
        "featured": False, "sort_order": 3,
    },
]


@app.on_event("startup")
async def seed_data():
    # Seed admin
    existing_admin = await db.admins.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    if not existing_admin:
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # Always reset password to env value to ensure consistency for testing
        await db.admins.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    # Seed default packages if collection is empty
    count = await db.packages.count_documents({})
    if count == 0:
        for p in DEFAULT_PACKAGES:
            pkg = Package(**p)
            doc = pkg.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.packages.insert_one(doc)
        logger.info(f"Seeded {len(DEFAULT_PACKAGES)} default packages")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
