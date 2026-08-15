# Deploy do Backend Vértice Sports em Cloudflare Python Workers + D1

Stack final:
- **Frontend React** → Cloudflare Pages
- **API FastAPI** → Cloudflare Python Worker (compat flag `python_workers`)
- **Persistência** → Cloudflare D1 (SQLite gerenciado)
- **E-mail** → Resend direto (via `js.fetch`)
- **APIs externas** → API-Football + football-data.org, chaves em Worker Secrets

---

## Pré-requisitos

1. Conta Cloudflare + zone `verticesports.ia.br` já apontando para a Cloudflare (nameservers).
2. Python 3.12+ e [uv](https://docs.astral.sh/uv/) instalados localmente.
3. Conta [Resend](https://resend.com) com o domínio `verticesports.ia.br` verificado.

---

## 1. Setup local

```bash
cd /app/worker
uvx --from workers-py pywrangler --version   # confirma instalação
cp .dev.vars.example .dev.vars               # preencha os valores
```

Faça login na Cloudflare:

```bash
uvx --from workers-py pywrangler login
```

---

## 2. Criar D1

```bash
uvx --from workers-py pywrangler d1 create vertice-sports
```

O output vai imprimir algo como:

```
✅ Successfully created DB 'vertice-sports'
[[d1_databases]]
binding = "DB"
database_name = "vertice-sports"
database_id = "abcd1234-..."
```

**Cole o `database_id` no `wrangler.toml`** (nas duas ocorrências: default e `env.production`).

---

## 3. Aplicar migration

**Local (para `pywrangler dev`):**
```bash
uvx --from workers-py pywrangler d1 execute vertice-sports --local --file=migrations/0001_init.sql
```

**Produção (D1 remoto):**
```bash
uvx --from workers-py pywrangler d1 execute vertice-sports --remote --file=migrations/0001_init.sql
```

---

## 4. Configurar secrets

**Local** (arquivo `.dev.vars` — nunca commite):
```env
JWT_SECRET="cole-uma-string-64-chars-aleatoria"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
SEED_SUPER_ADMIN_PASSWORD="aag4670123"
API_FOOTBALL_KEY=""
KIWIFY_WEBHOOK_SECRET=""
```

**Produção** (via CLI, um por um):
```bash
uvx --from workers-py pywrangler secret put JWT_SECRET
uvx --from workers-py pywrangler secret put RESEND_API_KEY
uvx --from workers-py pywrangler secret put SEED_SUPER_ADMIN_PASSWORD
# opcionais:
uvx --from workers-py pywrangler secret put API_FOOTBALL_KEY
uvx --from workers-py pywrangler secret put FOOTBALL_DATA_API_KEY
uvx --from workers-py pywrangler secret put KIWIFY_WEBHOOK_SECRET
uvx --from workers-py pywrangler secret put TELEGRAM_BOT_TOKEN
uvx --from workers-py pywrangler secret put TELEGRAM_CHANNEL_ID
```

Variáveis públicas (`APP_PUBLIC_URL`, `CORS_ORIGINS`, `RESEND_FROM`, etc.) já ficam no bloco `[vars]` do `wrangler.toml`.

---

## 5. Rodar localmente

```bash
uvx --from workers-py pywrangler dev
```

Isso levanta o Worker em `http://localhost:8787` usando **D1 local** (arquivo SQLite dentro de `.wrangler/state/`).

**Testes rápidos:**
```bash
curl http://localhost:8787/api/health
# → {"ok":true,"service":"vertice-sports","runtime":"cloudflare-python-worker"}

# Semear o super admin (uma única vez):
curl -X POST http://localhost:8787/api/auth/_seed-super-admin

# Login:
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arthurgarrigos1@gmail.com","password":"aag4670123"}'
```

---

## 6. Deploy em produção

```bash
uvx --from workers-py pywrangler deploy --env production
```

Após o primeiro deploy bem-sucedido, chame o seed:

```bash
curl -X POST https://vertice-sports-api.SEU_SUBDOMAIN.workers.dev/api/auth/_seed-super-admin
```

> 🔒 Depois de rodar o seed pela primeira vez, você pode **remover a rota**
> `/api/auth/_seed-super-admin` de `src/routes/auth.py` para evitar reuso.

---

## 7. Domínio customizado `api.verticesports.ia.br`

**Opção A — Custom Domain (recomendado, SSL automático):**

1. No `wrangler.toml`, descomente o bloco `[[routes]]`:
   ```toml
   [[routes]]
   pattern = "api.verticesports.ia.br/*"
   zone_name = "verticesports.ia.br"
   custom_domain = true
   ```
2. Rode `pywrangler deploy --env production` de novo.
3. A Cloudflare cria automaticamente o registro CNAME em `api` apontando para o Worker.

**Opção B — Workers Route via Dashboard:**

Dashboard Cloudflare → Workers & Pages → seu Worker → **Triggers** → **Add Custom Domain** → `api.verticesports.ia.br` → Save.

---

## 8. Frontend React → Cloudflare Pages

1. `cd /app/frontend && yarn build`
2. Dashboard Cloudflare → **Pages** → **Create project** → **Direct Upload** (ou conecte o GitHub).
3. Build settings:
   - **Framework preset:** Create React App
   - **Build command:** `yarn build`
   - **Build output directory:** `build`
4. **Environment variables** (Pages → Settings):
   - `REACT_APP_BACKEND_URL=https://api.verticesports.ia.br`
5. Custom domain: adicione `verticesports.ia.br` + `www.verticesports.ia.br` em Pages → Custom domains.

---

## 9. Verificação pós-deploy

```bash
# Health
curl https://api.verticesports.ia.br/api/health

# CORS preflight (deve retornar 200 + Access-Control-Allow-Origin)
curl -i -X OPTIONS https://api.verticesports.ia.br/api/auth/login \
  -H "Origin: https://verticesports.ia.br" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"

# Login super admin
curl -X POST https://api.verticesports.ia.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arthurgarrigos1@gmail.com","password":"aag4670123"}'
```

---

## Notas importantes

- **D1 é SQLite.** Não há `ObjectId` — IDs são UUIDs gerados no Python.
- **Cold start ~50ms** no Python Worker (bem melhor que Render free).
- **CPU limit:** 30s no plano free, 5min no Workers Paid — mais que suficiente para APIs REST.
- **Sem servidor tradicional:** não há processo persistente nem script de start. O runtime da Cloudflare invoca `Default.fetch(request)` em `src/entry.py` para cada request.
- **Sem `os.environ`:** todos os secrets/vars são acessados via `env.NOME_DA_VAR` propagado por ContextVar (`deps.get_secret`).
- **Rate limiting:** ativa em Cloudflare → Security → WAF → Rate limiting rules (grátis até 10k req/dia).
- **Backups do D1:** `pywrangler d1 export vertice-sports --output=backup.sql --remote` (recomendado rodar semanalmente).
