# Deploy do Backend Vértice Sports no Render

Este guia cobre o deploy do backend FastAPI no [Render](https://render.com).
O frontend deve ser hospedado separadamente (Vercel, Netlify ou o próprio Render Static Site).

---

## Pré-requisitos

1. **Repositório GitHub** com o código do Vértice Sports (use o botão "Save to GitHub" na Emergent).
2. **Conta MongoDB Atlas** ou outro Mongo acessível pela internet (com IP `0.0.0.0/0` liberado ou o range de IPs do Render).
3. **Conta Resend** com domínio verificado (`verticesports.ia.br` ou outro que você controle).

---

## Passo a passo

### 1. Prepare o MongoDB Atlas (se ainda não tiver)

1. Crie conta grátis em https://cloud.mongodb.com
2. Crie um cluster **M0 Free**
3. **Database Access** → crie um usuário com senha (anote)
4. **Network Access** → **Add IP** → `0.0.0.0/0` (ou os [IPs do Render](https://render.com/docs/static-outbound-ip-addresses))
5. **Clusters → Connect → Drivers** → copie a connection string:
   ```
   mongodb+srv://<USER>:<PASSWORD>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Deploy no Render (via Blueprint)

O arquivo `/app/render.yaml` na raiz do repositório já está pronto. No dashboard do Render:

1. Clique em **New** → **Blueprint**
2. Conecte seu GitHub e selecione o repositório do Vértice Sports
3. Render detecta automaticamente o `render.yaml` e mostra os serviços a criar
4. Preencha os **valores privados** solicitados:

   | Variável | Valor |
   |---|---|
   | `MONGO_URL` | A connection string do Atlas do passo 1 |
   | `RESEND_API_KEY` | `re_...` da sua conta Resend |
   | `SEED_SUPER_ADMIN_PASSWORD` | `aag4670123` (ou uma nova senha segura) |
   | `API_FOOTBALL_KEY` | (opcional) chave da API-Football |
   | `KIWIFY_WEBHOOK_SECRET` | (opcional) segredo do webhook Kiwify |
   | `TELEGRAM_BOT_TOKEN` | (opcional) |
   | `TELEGRAM_CHANNEL_ID` | (opcional) |

5. Clique em **Apply** — o Render vai:
   - Instalar as dependências (`pip install -r requirements.txt`)
   - Iniciar o servidor com `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Verificar o health check em `/api/health`

6. Anote a URL gerada, algo como:
   ```
   https://vertice-sports-api.onrender.com
   ```

### 3. Deploy manual (alternativa, sem Blueprint)

Se preferir configurar sem o `render.yaml`:

1. **New** → **Web Service** → conecte o repositório
2. Preencha:
   - **Name:** `vertice-sports-api`
   - **Region:** Oregon (ou mais próximo)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
3. Em **Environment** adicione todas as variáveis listadas no passo 2.4 acima + as públicas:
   - `DB_NAME=vertice_sports`
   - `JWT_ALGORITHM=HS256`
   - `JWT_EXPIRE_HOURS=168`
   - `CORS_ORIGINS=https://verticesports.ia.br,https://www.verticesports.ia.br`
   - `APP_PUBLIC_URL=https://verticesports.ia.br`
   - `RESEND_FROM=Vértice Sports <noreply@verticesports.ia.br>`
   - `EMAIL_FROM_NAME=Vértice Sports`
   - `EMAIL_REPLY_TO=suporteverticesportsio@gmail.com`
   - `SEED_SUPER_ADMIN_EMAIL=arthurgarrigos1@gmail.com`
   - `SEED_SUPER_ADMIN_NAME=Arthur Garrigos`
   - **Gere `JWT_SECRET`:** deixe o Render gerar em "Generate Value" (32+ caracteres aleatórios)
4. **Create Web Service**

### 4. Aponte o frontend para o backend

No frontend (Vercel/Netlify/onde estiver), defina a variável:

```
REACT_APP_BACKEND_URL=https://vertice-sports-api.onrender.com
```

E faça rebuild. O React reconstrói e passa a chamar sua API do Render.

### 5. Configure o domínio próprio no backend (opcional)

Se quiser expor a API em `api.verticesports.ia.br`:

1. No Render → seu serviço → **Settings** → **Custom Domain** → adicione `api.verticesports.ia.br`
2. No seu provedor de DNS, adicione o registro CNAME que o Render mostrar
3. Atualize `REACT_APP_BACKEND_URL=https://api.verticesports.ia.br` no frontend

---

## Verificação pós-deploy

```bash
# 1. Health check
curl https://vertice-sports-api.onrender.com/api/health
# → {"ok":true,"service":"vertice-sports","time":"..."}

# 2. Login super admin (senha aag4670123 ou a que você definiu no seed)
curl -X POST https://vertice-sports-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arthurgarrigos1@gmail.com","password":"aag4670123"}'
# → {"user":{...,"role":"SUPER_ADMIN"},"token":"..."}

# 3. E-mail (deve aparecer nos logs "[email] direct Resend -> ...")
curl -X POST https://vertice-sports-api.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"arthurgarrigos1@gmail.com"}'
```

Acompanhe os logs em tempo real em: dashboard Render → seu serviço → **Logs**.

---

## Notas importantes

- **Plano free do Render** hiberna o serviço após 15min de inatividade. A primeira request após hibernar leva ~30s (cold start). Use o plano **Starter ($7/mês)** para produção.
- **Auto deploy:** o Render redeployará automaticamente a cada push no branch `main` (comportamento definido em `render.yaml`).
- **Secrets:** nunca commite valores reais no `.env` ou `render.yaml`. Todos os `sync: false` obrigam preencher pelo dashboard.
- **Logs:** o backend loga qual provedor de e-mail está sendo usado (`[email] direct Resend` ou `[email] emergent proxy`).
- **Rollback:** o Render mantém histórico de deploys — em **Events** você pode reverter para um deploy anterior em um clique.
