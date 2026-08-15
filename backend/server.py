"""Vértice Sports — FastAPI backend entrypoint."""
from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("vertice")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="Vértice Sports API")

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
async def health():
    return {"ok": True, "service": "vertice-sports", "time": datetime.utcnow().isoformat()}


# Import routers after `db` is defined so their `from server import db` works.
from routes_auth import router as auth_router  # noqa: E402
from routes_bets import router as bets_router  # noqa: E402
from routes_admin import router as admin_router  # noqa: E402
from routes_matches import router as matches_router  # noqa: E402
from routes_webhooks import router as kiwify_router  # noqa: E402

api_router.include_router(auth_router)
api_router.include_router(bets_router)
api_router.include_router(admin_router)
api_router.include_router(matches_router)
api_router.include_router(kiwify_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.bets.create_index("id", unique=True)
    await db.bets.create_index("created_at")
    await db.password_reset_tokens.create_index("token_hash")
    await db.password_reset_tokens.create_index("user_id")

    # Seed super admin
    from auth_utils import hash_password
    seed_email = os.environ.get("SEED_SUPER_ADMIN_EMAIL", "").lower().strip()
    seed_pw = os.environ.get("SEED_SUPER_ADMIN_PASSWORD", "").strip()
    seed_name = os.environ.get("SEED_SUPER_ADMIN_NAME", "Super Admin").strip()
    if seed_email and seed_pw:
        existing = await db.users.find_one({"email": seed_email}, {"_id": 0})
        if not existing:
            import uuid
            now_iso = datetime.utcnow().isoformat()
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "name": seed_name,
                "email": seed_email,
                "password_hash": hash_password(seed_pw),
                "role": "SUPER_ADMIN",
                "plan": "FULL",
                "subscription_status": "ACTIVE",
                "active": True,
                "created_at": now_iso,
                "updated_at": now_iso,
            })
            logger.info(f"Seeded SUPER_ADMIN: {seed_email}")
        else:
            # ensure role + plan
            await db.users.update_one(
                {"email": seed_email},
                {"$set": {"role": "SUPER_ADMIN", "plan": "FULL", "active": True}},
            )


@app.on_event("shutdown")
async def shutdown():
    client.close()
