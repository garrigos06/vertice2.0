# Vértice Sports — Worker

Backend FastAPI rodando em **Cloudflare Python Workers** com persistência em **Cloudflare D1**.

## Estrutura

```
worker/
├── wrangler.toml              # Config do Worker (bindings, vars, rotas)
├── pyproject.toml             # Deps Python (Pyodide-compatible)
├── .dev.vars.example          # Template de secrets (copie para .dev.vars)
├── DEPLOY_CLOUDFLARE.md       # Guia passo a passo de deploy
├── migrations/
│   └── 0001_init.sql          # Schema D1 (users, bets, prt, kiwify_events, audit_logs)
└── src/
    ├── entry.py               # WorkerEntrypoint → ASGI bridge
    ├── app.py                 # FastAPI factory + CORS + routers
    ├── deps.py                # ContextVar env + auth deps (RBAC)
    ├── security.py            # PBKDF2-HMAC-SHA256 (hash de senha compatível com Pyodide) + JWT
    ├── models.py              # Pydantic schemas
    ├── repo.py                # D1 query layer (SQL parametrizado)
    ├── http_client.py         # js.fetch wrapper (outbound HTTP)
    ├── email_service.py       # Resend direct
    └── routes/
        ├── auth.py            # register/login/me/logout/forgot/reset + seed
        ├── bets.py            # public list/history + admin CRUD
        ├── admin.py           # stats + users mgmt
        ├── matches.py         # API-Football + football-data
        └── webhooks.py        # Kiwify
```

## Rotas preservadas (idênticas ao backend original)

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/health` | público |
| POST | `/api/auth/register` | público |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | Bearer |
| POST | `/api/auth/logout` | público |
| POST | `/api/auth/forgot-password` | público (anti-enum) |
| POST | `/api/auth/reset-password` | público |
| POST | `/api/auth/_seed-super-admin` | requer `SEED_SUPER_ADMIN_PASSWORD` secret |
| GET | `/api/bets` | opcional (gating por plano) |
| GET | `/api/bets/history` | opcional |
| GET | `/api/bets/{id}` | opcional |
| POST | `/api/bets/admin` | ADMIN |
| PATCH | `/api/bets/admin/{id}` | ADMIN |
| DELETE | `/api/bets/admin/{id}` | ADMIN |
| GET | `/api/bets/admin/all` | ADMIN |
| GET | `/api/admin/stats` | ADMIN |
| GET | `/api/admin/users` | ADMIN |
| PATCH | `/api/admin/users/{id}` | ADMIN (SUPER_ADMIN para conceder ADMIN) |
| GET | `/api/matches` | público |
| GET | `/api/matches/health` | público |
| POST | `/api/kiwify/webhook` | HMAC via secret |

## Quick start

```bash
# 1. Install pywrangler
uvx --from workers-py pywrangler --version

# 2. Create D1 (anote o database_id e cole no wrangler.toml)
uvx --from workers-py pywrangler d1 create vertice-sports

# 3. Apply migration locally
uvx --from workers-py pywrangler d1 execute vertice-sports --local --file=migrations/0001_init.sql

# 4. Dev
cp .dev.vars.example .dev.vars   # preencha os secrets
uvx --from workers-py pywrangler dev

# 5. Deploy
uvx --from workers-py pywrangler d1 execute vertice-sports --remote --file=migrations/0001_init.sql
uvx --from workers-py pywrangler secret put JWT_SECRET
uvx --from workers-py pywrangler secret put RESEND_API_KEY
uvx --from workers-py pywrangler secret put SEED_SUPER_ADMIN_PASSWORD
uvx --from workers-py pywrangler deploy --env production
```

Guia completo em [`DEPLOY_CLOUDFLARE.md`](./DEPLOY_CLOUDFLARE.md).
