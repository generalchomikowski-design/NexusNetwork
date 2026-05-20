from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
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
SUPER_ADMIN_EMAIL = "generalchomikowski@gmail.com"

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
    customer_email: EmailStr
    discord_name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
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
    discord_name: Optional[str] = None
    description: Optional[str] = None
    server_name: Optional[str] = None
    created_at: str


class AdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class AdminOut(BaseModel):
    email: str
    role: str
    created_at: Optional[str] = None


# ====== TICKETS ======

TICKET_PRIORITIES = {"low", "medium", "high"}


class TicketMessage(BaseModel):
    id: str
    author_id: str
    author_name: str
    author_role: str  # "user" | "admin"
    text: str
    created_at: str


class Ticket(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: Optional[str] = None
    subject: str
    priority: str
    status: str  # "open" | "closed"
    messages: List[TicketMessage]
    created_at: str
    updated_at: str


class TicketCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=4000)
    priority: str = Field(default="medium")


class TicketReply(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


# ====== POSTS (Najnowsze informacje / Blog) ======

class Post(BaseModel):
    id: str
    title: str
    body: str
    youtube_url: Optional[str] = None
    published: bool = True
    created_at: str
    updated_at: str


class PostCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=2, max_length=10000)
    youtube_url: Optional[str] = Field(default=None, max_length=400)
    published: bool = True


class PostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    body: Optional[str] = Field(default=None, min_length=2, max_length=10000)
    youtube_url: Optional[str] = Field(default=None, max_length=400)
    published: Optional[bool] = None


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


async def require_super_admin(email: str = Depends(require_admin)) -> str:
    if email.lower() != SUPER_ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Tylko super-admin może wykonać tę operację")
    return email


# ====== CUSTOMER AUTH (JWT + Google via Emergent) ======

USER_JWT_TTL_DAYS = 7
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


class UserPublic(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str  # "password" | "google"
    is_admin: bool = False
    is_super_admin: bool = False
    admin_token: Optional[str] = None  # Set on login response if user is also an admin


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionPayload(BaseModel):
    session_id: str = Field(min_length=8, max_length=400)


def create_user_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "user",
        "exp": datetime.now(timezone.utc) + timedelta(days=USER_JWT_TTL_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_user_auth_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    # Same-origin via Kubernetes ingress, so lax + secure works in production
    response.set_cookie(
        key=name, value=value, httponly=True, secure=True,
        samesite="none", max_age=max_age, path="/",
    )


def clear_user_auth_cookies(response: Response) -> None:
    for n in ("nx_user_token", "nx_session_token"):
        response.delete_cookie(key=n, path="/")


def user_doc_to_public(doc: Dict, admin_token: Optional[str] = None) -> UserPublic:
    email = (doc.get("email") or "").lower()
    return UserPublic(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc.get("name"),
        picture=doc.get("picture"),
        provider=doc.get("provider", "password"),
        is_admin=bool(doc.get("is_admin", False)) or admin_token is not None,
        is_super_admin=email == SUPER_ADMIN_EMAIL.lower(),
        admin_token=admin_token,
    )


async def get_current_user(request: Request) -> Dict:
    """Resolve current customer via JWT cookie/Authorization header OR Google session cookie."""
    # 1) JWT (password auth)
    token = request.cookies.get("nx_user_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "user":
                user_id = payload.get("sub")
                doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
                if doc:
                    return doc
        except jwt.PyJWTError:
            pass

    # 2) Google session token (set by /api/auth/google/session)
    session_token = request.cookies.get("nx_session_token")
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                try:
                    expires_at = datetime.fromisoformat(expires_at)
                except Exception:
                    expires_at = None
            if expires_at:
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at >= datetime.now(timezone.utc):
                    doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
                    if doc:
                        return doc

    raise HTTPException(status_code=401, detail="Brak autoryzacji")


async def require_user(user: Dict = Depends(get_current_user)) -> Dict:
    return user


@api_router.post("/auth/register", response_model=UserPublic)
async def auth_register(payload: RegisterPayload, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Konto z tym adresem email już istnieje")
    user_id = f"user_{uuid.uuid4().hex[:14]}"
    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name or email.split("@")[0],
        "picture": None,
        "provider": "password",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_user_jwt(user_id, email)
    set_user_auth_cookie(response, "nx_user_token", token, max_age=USER_JWT_TTL_DAYS * 24 * 3600)
    return user_doc_to_public(doc)


@api_router.post("/auth/login", response_model=UserPublic)
async def auth_login(payload: LoginPayload, response: Response):
    email = payload.email.lower().strip()

    # First check if these credentials match an admin account.
    admin_doc = await db.admins.find_one({"email": email}, {"_id": 0})
    if admin_doc and verify_password(payload.password, admin_doc["password_hash"]):
        # Ensure a matching `users` doc exists so the customer gate also lets them in.
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
        if not user_doc:
            user_id = f"user_{uuid.uuid4().hex[:14]}"
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": email.split("@")[0],
                "picture": None,
                "provider": "password",
                "password_hash": hash_password(payload.password),
                "is_admin": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.users.insert_one(user_doc)
        else:
            # Keep the user password in sync with admin password for convenience.
            await db.users.update_one(
                {"user_id": user_doc["user_id"]},
                {"$set": {"password_hash": hash_password(payload.password), "is_admin": True}},
            )
            user_doc["is_admin"] = True

        user_token = create_user_jwt(user_doc["user_id"], email)
        set_user_auth_cookie(response, "nx_user_token", user_token, max_age=USER_JWT_TTL_DAYS * 24 * 3600)
        admin_token = create_jwt(email)  # admin JWT (existing function)
        return user_doc_to_public(user_doc, admin_token=admin_token)

    # Fallback: regular customer login
    doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not doc or not doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Niepoprawny email lub hasło")
    if not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Niepoprawny email lub hasło")
    token = create_user_jwt(doc["user_id"], email)
    set_user_auth_cookie(response, "nx_user_token", token, max_age=USER_JWT_TTL_DAYS * 24 * 3600)
    return user_doc_to_public(doc)


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    # Best-effort: also remove Google session if cookie present
    sess_token = request.cookies.get("nx_session_token")
    if sess_token:
        await db.user_sessions.delete_one({"session_token": sess_token})
    clear_user_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserPublic)
async def auth_me(user: Dict = Depends(require_user)):
    email = (user.get("email") or "").lower()
    admin_token: Optional[str] = None
    is_admin = bool(user.get("is_admin", False))
    if not is_admin:
        admin_doc = await db.admins.find_one({"email": email}, {"_id": 0})
        if admin_doc:
            is_admin = True
    if is_admin:
        admin_token = create_jwt(email)
        user["is_admin"] = True
    return user_doc_to_public(user, admin_token=admin_token)


@api_router.post("/auth/google/session", response_model=UserPublic)
async def auth_google_session(payload: GoogleSessionPayload, response: Response):
    # Exchange session_id with Emergent backend
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": payload.session_id})
        except Exception as e:
            logging.exception("Emergent auth call failed")
            raise HTTPException(status_code=502, detail=f"Błąd autoryzacji Google: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Niepoprawna sesja Google")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="Nieprawidłowa odpowiedź autoryzacji")

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name or existing.get("name"), "picture": picture or existing.get("picture")}},
        )
        user_doc = {**existing, "name": name or existing.get("name"), "picture": picture or existing.get("picture")}
    else:
        user_id = f"user_{uuid.uuid4().hex[:14]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name or email.split("@")[0],
            "picture": picture,
            "provider": "google",
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)

    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "email": email,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    set_user_auth_cookie(response, "nx_session_token", session_token, max_age=7 * 24 * 3600)
    # If this Google email matches an admin, also issue an admin token
    admin_token: Optional[str] = None
    admin_doc = await db.admins.find_one({"email": email}, {"_id": 0})
    if admin_doc:
        admin_token = create_jwt(email)
        user_doc["is_admin"] = True
    return user_doc_to_public(user_doc, admin_token=admin_token)


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
    is_super = email.lower() == SUPER_ADMIN_EMAIL.lower()
    return {"email": email, "role": "super" if is_super else "admin", "is_super": is_super}


# ====== SUPER-ADMIN: manage admins ======

@api_router.get("/admin/admins", response_model=List[AdminOut])
async def list_admins(_: str = Depends(require_super_admin)):
    docs = await db.admins.find({}, {"_id": 0, "email": 1, "created_at": 1}).sort("created_at", 1).to_list(200)
    out: List[AdminOut] = []
    for d in docs:
        email = d.get("email", "")
        role = "super" if email.lower() == SUPER_ADMIN_EMAIL.lower() else "admin"
        out.append(AdminOut(email=email, role=role, created_at=d.get("created_at")))
    return out


@api_router.post("/admin/admins", response_model=AdminOut)
async def create_admin(payload: AdminCreate, _: str = Depends(require_super_admin)):
    email = payload.email.lower()
    existing = await db.admins.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Administrator z tym adresem email już istnieje")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admins.insert_one(doc)
    return AdminOut(email=email, role="admin", created_at=doc["created_at"])


@api_router.delete("/admin/admins/{email}")
async def delete_admin(email: str, current: str = Depends(require_super_admin)):
    target = email.lower()
    if target == SUPER_ADMIN_EMAIL.lower():
        raise HTTPException(status_code=400, detail="Nie można usunąć konta super-admina")
    if target == current.lower():
        raise HTTPException(status_code=400, detail="Nie możesz usunąć własnego konta")
    result = await db.admins.delete_one({"email": target})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Administrator nie znaleziony")
    return {"ok": True}


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
            discord_name=d.get("discord_name"),
            description=d.get("description"),
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
        "customer_email": str(payload.customer_email),
        "discord_name": payload.discord_name,
    }
    if payload.server_name:
        metadata["server_name"] = payload.server_name
    # Keep metadata short – Stripe limits metadata value to 500 chars
    metadata["description"] = (payload.description or "")[:450]

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
        "customer_email": str(payload.customer_email),
        "discord_name": payload.discord_name,
        "description": payload.description,
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


# ====== TICKETS ======

def _normalize_priority(p: Optional[str]) -> str:
    p = (p or "medium").lower()
    return p if p in TICKET_PRIORITIES else "medium"


def _ticket_doc_to_model(doc: Dict) -> Ticket:
    msgs = [TicketMessage(**m) for m in (doc.get("messages") or [])]
    return Ticket(
        id=doc["id"],
        user_id=doc["user_id"],
        user_email=doc["user_email"],
        user_name=doc.get("user_name"),
        subject=doc["subject"],
        priority=doc.get("priority", "medium"),
        status=doc.get("status", "open"),
        messages=msgs,
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at", doc["created_at"]),
    )


@api_router.post("/tickets", response_model=Ticket)
async def create_ticket(payload: TicketCreate, user: Dict = Depends(require_user)):
    now = datetime.now(timezone.utc).isoformat()
    first_msg = {
        "id": str(uuid.uuid4()),
        "author_id": user["user_id"],
        "author_name": user.get("name") or user["email"],
        "author_role": "user",
        "text": payload.message,
        "created_at": now,
    }
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "user_email": user["email"],
        "user_name": user.get("name"),
        "subject": payload.subject,
        "priority": _normalize_priority(payload.priority),
        "status": "open",
        "messages": [first_msg],
        "created_at": now,
        "updated_at": now,
    }
    await db.tickets.insert_one(doc)
    return _ticket_doc_to_model(doc)


@api_router.get("/tickets/mine", response_model=List[Ticket])
async def my_tickets(user: Dict = Depends(require_user)):
    docs = await db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return [_ticket_doc_to_model(d) for d in docs]


@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str, user: Dict = Depends(require_user)):
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket nie znaleziony")
    # Owner OR admin can read
    is_owner = doc["user_id"] == user["user_id"]
    is_admin = bool(user.get("is_admin")) or bool(
        await db.admins.find_one({"email": user["email"]}, {"_id": 0})
    )
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Brak dostępu do tego ticketu")
    return _ticket_doc_to_model(doc)


@api_router.post("/tickets/{ticket_id}/reply", response_model=Ticket)
async def reply_ticket(ticket_id: str, payload: TicketReply, user: Dict = Depends(require_user)):
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket nie znaleziony")
    if doc.get("status") == "closed":
        raise HTTPException(status_code=400, detail="Ticket został zamknięty")
    is_owner = doc["user_id"] == user["user_id"]
    is_admin_user = bool(user.get("is_admin")) or bool(
        await db.admins.find_one({"email": user["email"]}, {"_id": 0})
    )
    if not (is_owner or is_admin_user):
        raise HTTPException(status_code=403, detail="Brak dostępu do tego ticketu")
    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "id": str(uuid.uuid4()),
        "author_id": user["user_id"],
        "author_name": user.get("name") or user["email"],
        "author_role": "admin" if (is_admin_user and not is_owner) else ("admin" if is_admin_user else "user"),
        "text": payload.text,
        "created_at": now,
    }
    # If admin is also owner of the ticket, still mark as admin reply for clarity if they're acting as admin
    if is_admin_user and is_owner:
        # User who is admin: keep their original role as 'user' on tickets they opened themselves
        msg["author_role"] = "user"
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"messages": msg}, "$set": {"updated_at": now}},
    )
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return _ticket_doc_to_model(updated)


# ----- Admin ticket endpoints -----

@api_router.get("/admin/tickets", response_model=List[Ticket])
async def admin_list_tickets(_: str = Depends(require_admin)):
    docs = await db.tickets.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return [_ticket_doc_to_model(d) for d in docs]


@api_router.put("/admin/tickets/{ticket_id}/status", response_model=Ticket)
async def admin_update_ticket_status(ticket_id: str, new_status: str, _: str = Depends(require_admin)):
    if new_status not in {"open", "closed"}:
        raise HTTPException(status_code=400, detail="Niepoprawny status")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.tickets.update_one(
        {"id": ticket_id}, {"$set": {"status": new_status, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket nie znaleziony")
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return _ticket_doc_to_model(updated)


# ====== POSTS / NEWS ======

def _post_doc_to_model(d: Dict) -> Post:
    return Post(
        id=d["id"],
        title=d["title"],
        body=d["body"],
        youtube_url=d.get("youtube_url"),
        published=bool(d.get("published", True)),
        created_at=d.get("created_at", ""),
        updated_at=d.get("updated_at", d.get("created_at", "")),
    )


@api_router.get("/posts", response_model=List[Post])
async def list_posts(limit: int = 50, include_unpublished: bool = False):
    query: Dict = {} if include_unpublished else {"published": True}
    docs = await db.posts.find(query, {"_id": 0}).sort("created_at", -1).limit(max(1, min(limit, 200))).to_list(200)
    return [_post_doc_to_model(d) for d in docs]


@api_router.post("/admin/posts", response_model=Post)
async def admin_create_post(payload: PostCreate, _: str = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "body": payload.body,
        "youtube_url": payload.youtube_url or None,
        "published": payload.published,
        "created_at": now,
        "updated_at": now,
    }
    await db.posts.insert_one(doc)
    return _post_doc_to_model(doc)


@api_router.put("/admin/posts/{post_id}", response_model=Post)
async def admin_update_post(post_id: str, payload: PostUpdate, _: str = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Brak danych do aktualizacji")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.posts.update_one({"id": post_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post nie znaleziony")
    doc = await db.posts.find_one({"id": post_id}, {"_id": 0})
    return _post_doc_to_model(doc)


@api_router.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, _: str = Depends(require_admin)):
    result = await db.posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post nie znaleziony")
    return {"ok": True}


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
    # Indexes for customer auth collections
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.tickets.create_index([("user_id", 1), ("updated_at", -1)])
        await db.tickets.create_index("updated_at")
    except Exception as e:
        logging.warning(f"Index creation: {e}")

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
