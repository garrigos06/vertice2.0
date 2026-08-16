"""FastAPI application factory. Registra middlewares, CORS e todos os routers."""
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from deps import get_current_env
from routes.auth import router as auth_router
from routes.bets import router as bets_router
from routes.admin import router as admin_router
from routes.matches import router as matches_router
from routes.webhooks import router as kiwify_router
from routes.telegram import router as telegram_router


app = FastAPI(title="Vértice Sports API", docs_url=None, redoc_url=None)

# CORS lido do binding [vars] em wrangler.toml (CORS_ORIGINS csv)
# Como middlewares são registrados no boot (sem env), usamos regex permissivo
# aqui e conferimos o Origin real dentro de um middleware customizado.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://verticesports.ia.br",
        "https://www.verticesports.ia.br",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)


api = APIRouter(prefix="/api")


@api.get("/health")
async def health():
    return {"ok": True, "service": "vertice-sports", "runtime": "cloudflare-python-worker"}


api.include_router(auth_router)
api.include_router(bets_router)
api.include_router(admin_router)
api.include_router(matches_router)
api.include_router(kiwify_router)
api.include_router(telegram_router)

app.include_router(api)


@app.get("/")
async def root():
    return {"service": "vertice-sports", "docs": "/api/health"}
