"""
Backend API tests for Nexus Network.
Covers: health, packages (public), admin auth & CRUD, transactions, Stripe checkout, contact.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexus-network-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@nexusnetwork.pl"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_session(session, admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s


# ====== Health / Root ======
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert data.get("status") == "online"


# ====== Public Packages ======
class TestPackages:
    def test_list_all_packages(self, session):
        r = session.get(f"{API}/packages", timeout=30)
        assert r.status_code == 200
        pkgs = r.json()
        assert isinstance(pkgs, list)
        # Should have 10 seeded packages
        assert len(pkgs) >= 10, f"Expected >=10 packages, got {len(pkgs)}"
        # Categories
        cats = {p["category"] for p in pkgs}
        assert {"hosting", "addons", "maps"}.issubset(cats)
        # No mongo _id leak
        for p in pkgs:
            assert "_id" not in p

    def test_filter_hosting(self, session):
        r = session.get(f"{API}/packages", params={"category": "hosting"}, timeout=30)
        assert r.status_code == 200
        pkgs = r.json()
        assert len(pkgs) >= 4
        assert all(p["category"] == "hosting" for p in pkgs)
        # Verify expected hosting names + prices in PLN
        by_name = {p["name"]: p for p in pkgs}
        assert by_name["Basic"]["price"] == 50.0
        assert by_name["Normal"]["price"] == 60.0
        assert by_name["Pro"]["price"] == 70.0
        assert by_name["Pro"]["featured"] is True
        assert by_name["VIP"]["price"] == 100.0

    def test_filter_addons(self, session):
        r = session.get(f"{API}/packages", params={"category": "addons"}, timeout=30)
        assert r.status_code == 200
        pkgs = r.json()
        assert len(pkgs) >= 3
        assert all(p["category"] == "addons" for p in pkgs)

    def test_filter_maps(self, session):
        r = session.get(f"{API}/packages", params={"category": "maps"}, timeout=30)
        assert r.status_code == 200
        pkgs = r.json()
        assert len(pkgs) >= 3
        assert all(p["category"] == "maps" for p in pkgs)

    def test_get_single_package(self, session):
        r = session.get(f"{API}/packages", timeout=30)
        pkg_id = r.json()[0]["id"]
        r2 = session.get(f"{API}/packages/{pkg_id}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["id"] == pkg_id

    def test_get_package_404(self, session):
        r = session.get(f"{API}/packages/nonexistent-id-xxx", timeout=30)
        assert r.status_code == 404


# ====== Admin Auth ======
class TestAdminAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_login_unknown_email(self, session):
        r = session.post(f"{API}/admin/login", json={"email": "ghost@nexusnetwork.pl", "password": "x"}, timeout=30)
        assert r.status_code == 401

    def test_me_with_token(self, admin_session):
        r = admin_session.get(f"{API}/admin/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_token(self, session):
        r = session.get(f"{API}/admin/me", timeout=30)
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/admin/me", headers={"Authorization": "Bearer invalid.jwt.token"}, timeout=30)
        assert r.status_code == 401


# ====== Admin Package CRUD ======
class TestAdminPackageCRUD:
    @pytest.fixture
    def created_pkg(self, admin_session):
        payload = {
            "category": "addons",
            "name": f"TEST_Pack_{uuid.uuid4().hex[:6]}",
            "price": 12.5,
            "old_price": 25.0,
            "promo_label": "-50%",
            "description": "Test pkg",
            "specs": ["spec1", "spec2"],
            "featured": False,
            "sort_order": 99,
            "active": True,
        }
        r = admin_session.post(f"{API}/admin/packages", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        pkg = r.json()
        yield pkg
        # cleanup
        admin_session.delete(f"{API}/admin/packages/{pkg['id']}", timeout=30)

    def test_create_without_token(self, session):
        r = session.post(f"{API}/admin/packages", json={"category": "addons", "name": "x", "price": 1}, timeout=30)
        assert r.status_code == 401

    def test_create_persists(self, admin_session, created_pkg):
        # GET to verify it persists
        r = admin_session.get(f"{API}/packages/{created_pkg['id']}", timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == created_pkg["name"]
        assert r.json()["price"] == 12.5

    def test_update_package(self, admin_session, created_pkg):
        r = admin_session.put(
            f"{API}/admin/packages/{created_pkg['id']}",
            json={"price": 99.99, "name": created_pkg["name"] + "_UPD"},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.json()["price"] == 99.99
        # Verify persisted
        r2 = admin_session.get(f"{API}/packages/{created_pkg['id']}", timeout=30)
        assert r2.json()["price"] == 99.99
        assert r2.json()["name"].endswith("_UPD")

    def test_update_404(self, admin_session):
        r = admin_session.put(f"{API}/admin/packages/no-such-id", json={"price": 1}, timeout=30)
        assert r.status_code == 404

    def test_delete_package(self, admin_session):
        # create one to delete
        r = admin_session.post(f"{API}/admin/packages", json={
            "category": "maps", "name": f"TEST_Del_{uuid.uuid4().hex[:6]}", "price": 5.0,
        }, timeout=30)
        pid = r.json()["id"]
        dr = admin_session.delete(f"{API}/admin/packages/{pid}", timeout=30)
        assert dr.status_code == 200
        # verify gone
        gr = admin_session.get(f"{API}/packages/{pid}", timeout=30)
        assert gr.status_code == 404

    def test_delete_404(self, admin_session):
        r = admin_session.delete(f"{API}/admin/packages/no-such-id", timeout=30)
        assert r.status_code == 404


# ====== Transactions ======
class TestTransactions:
    def test_list_without_token(self, session):
        r = session.get(f"{API}/admin/transactions", timeout=30)
        assert r.status_code == 401

    def test_list_with_token(self, admin_session):
        r = admin_session.get(f"{API}/admin/transactions", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ====== Checkout ======
class TestCheckout:
    def test_checkout_invalid_pkg(self, session):
        r = session.post(f"{API}/checkout/create", json={
            "package_id": "no-such-id", "origin_url": BASE_URL,
        }, timeout=30)
        assert r.status_code == 404

    def test_checkout_creates_session(self, session, admin_session):
        # pick hosting Pro
        pkgs = session.get(f"{API}/packages", params={"category": "hosting"}, timeout=30).json()
        pro = next((p for p in pkgs if p["name"] == "Pro"), pkgs[0])
        r = session.post(f"{API}/checkout/create", json={
            "package_id": pro["id"],
            "origin_url": BASE_URL,
            "customer_email": "test@example.com",
            "server_name": "TEST_Server",
        }, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data and data["url"].startswith("http")
        assert "session_id" in data and data["session_id"]
        session_id = data["session_id"]

        # Verify pending transaction recorded with correct amount/currency in admin transactions
        tr = admin_session.get(f"{API}/admin/transactions", timeout=30).json()
        match = next((t for t in tr if t["session_id"] == session_id), None)
        assert match is not None, "Transaction not recorded"
        assert match["currency"] == "pln"
        assert match["amount"] == pro["price"]
        assert match["status"] in ("initiated", "open", "pending")
        assert match["payment_status"] in ("pending", "unpaid")

        # Check status endpoint
        time.sleep(1)
        sr = session.get(f"{API}/checkout/status/{session_id}", timeout=30)
        assert sr.status_code == 200
        sd = sr.json()
        assert sd["session_id"] == session_id
        assert "status" in sd
        assert "payment_status" in sd
        assert sd["currency"].lower() == "pln"

    def test_checkout_status_404(self, session):
        r = session.get(f"{API}/checkout/status/cs_nonexistent_abc", timeout=30)
        assert r.status_code == 404


# ====== Contact ======
class TestContact:
    def test_submit_contact(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "TEST User",
            "email": "test@example.com",
            "subject": "Test",
            "message": "Hello from automated test",
        }, timeout=30)
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert "id" in r.json()

    def test_contact_invalid_email(self, session):
        r = session.post(f"{API}/contact", json={
            "name": "TEST", "email": "not-an-email", "message": "x",
        }, timeout=30)
        assert r.status_code == 422
