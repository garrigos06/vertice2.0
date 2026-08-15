# Vértice Sports — PRD

## Original Problem Statement
Plataforma web premium de análises esportivas, estatísticas, bilhetes/palpites e
inteligência de futebol em Brazilian Portuguese. NÃO é uma casa de apostas —
somente publica análises com redirecionamento externo para casas autorizadas.

## Personas
- **Visitante público** — vê home, bilhetes gratuitos, histórico transparente e planos.
- **Usuário FREE** — cadastra grátis, acompanha bilhetes FREE.
- **Usuário PRO (R$ 25,90/mês)** — bilhetes Pro + chat com IA.
- **Usuário FULL (R$ 49,90/mês)** — todos os bilhetes + Telegram exclusivo.
- **Admin / Super Admin** — painel administrativo com CRUD, Inteligência, auditoria.

## Core Requirements (static)
- Sem carteira, depósito, saque, apostas internas ou processamento de odds.
- Autenticação segura com JWT (Bearer) + bcrypt + fluxo profissional de recuperação
  de senha (token SHA-256, single-use, 30 min, anti-enumeração).
- Design premium: paleta preto/grafite + verde neon (#CCFF00), Clash Display /
  Manrope / JetBrains Mono, mobile-first com bottom nav e sidebar desktop.
- Painel admin com sidebar fixa, header com role, KPIs, CRUD de bilhetes e usuários.
- Bilhetes com categorias SIMPLES/COMBINADO/MULTIPLO/SUPERODD e status
  PENDENTE/GREEN/RED/VOID/CANCELADO; histórico público e transparente.
- Integrações externas isoladas em adapters — Kiwify (webhook), API-Football,
  football-data, Telegram — todas com fallback "não configurado".

## Implemented (Phase 1) — 2026-02
- **Stack:** React (SPA) + FastAPI + MongoDB (Motor).
- **Auth completa:** register/login/me/logout + forgot-password/reset-password via
  Emergent-managed Resend (30-min token, cooldown 60s, anti-enum, single-use,
  invalida sessões implicitamente).
- **RBAC:** USER / ADMIN / SUPER_ADMIN + gating de planos FREE / PRO / FULL.
- **Bilhetes:** CRUD admin, listagem pública, filtros por categoria/status/plano,
  histórico com KPIs (total/green/red/void/hit_rate), gating de conteúdo por plano
  (locked=true esconde rationale/selections/external_url).
- **Admin panel:** dashboard com KPIs, CRUD bilhetes (com ações Green/Red/Void),
  gerenciamento de usuários (buscar, alterar plano/role/ativo, guard de
  SUPER_ADMIN para conceder ADMIN).
- **Matches multi-provider:** API-Football + football-data.org + fallback
  "TheSportsDB", com dedupe, health endpoint e retorno `configured: false` quando
  chaves não estão setadas.
- **Kiwify webhook:** `/api/kiwify/webhook` com validação de segredo, dedupe de
  eventos, ativação/cancelamento automático de plano.
- **Público:** Home (hero + KPIs + destaques + CTA Full), Bilhetes, Histórico,
  Ao Vivo, Calendário, Planos, Login, Cadastro, Conta, Recuperar/Redefinir senha.
- **Design system:** Clash Display + Manrope + JetBrains Mono; classes utilitárias
  `.vs-card`, `.vs-glow`, `.vs-skeleton`; bottom nav mobile + sidebar admin
  desktop; badges de status (Green/Red/Void/Pendente).
- **Super admin semeado no startup:** arthurgarrigos1@gmail.com.
- **AuditLog:** ações admin (bet.create/update/delete, user.update) gravadas em
  `audit_logs`.

## Test Report
- `/app/test_reports/iteration_1.json` — backend 100%, frontend 100%, zero falhas.

## Backlog / Next Phases
### P0 (próxima entrega)
- **Fase 6 — Inteligência Vértice:** Scanner (filtros estatísticos), Comparador,
  Todas as partidas (agrupamento por competição), Salvos.
- **Fase 4 — Kiwify checkout links + página de assinatura.** Endpoint pronto,
  falta configurar link produto por plano e recuperar histórico via `/admin/planos`.
### P1
- **Fase 5 — Telegram** feed interno para FULL (via bot getUpdates + webhook).
- **Fase 7 — Motor estatístico** (últimos 5/10/20, casa/fora, over/under,
  escanteios, cartões, consistência alta/média/baixa).
- **Fase 8 — Scanner** rodando sobre o motor estatístico.
- **Fase 9 — Comparador** de partidas/equipes.
- **Fase 10 — IA Vértice** para gerar análises (Emergent LLM Key + Claude).
### P2
- Cache esportivo com TTL por estado (agendada 6h, hoje 30min, ao vivo 1-2min).
- Rate limiting em endpoints públicos.
- Página `/admin/configuracoes` com preferências e AuditLog viewer.
- Domain verification para envio de e-mails com `noreply@auth.verticesports.ia.br`.

## Environment
- `/app/backend/.env` slots preenchidos: MONGO/DB, JWT, EMERGENT_EMAIL_KEY,
  EMAIL_FROM_NAME, SEED_SUPER_ADMIN_*. Slots vazios (esperando input):
  `API_FOOTBALL_KEY`, `FOOTBALL_DATA_API_KEY`, `KIWIFY_WEBHOOK_SECRET`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`.
