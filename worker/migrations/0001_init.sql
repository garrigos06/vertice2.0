-- Vértice Sports — D1 schema (SQLite)
-- Aplicar com: `pywrangler d1 execute vertice-sports --file=migrations/0001_init.sql`

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    password_hash        TEXT NOT NULL,
    role                 TEXT NOT NULL DEFAULT 'USER',       -- USER | ADMIN | SUPER_ADMIN
    plan                 TEXT NOT NULL DEFAULT 'FREE',        -- FREE | PRO | FULL
    subscription_status  TEXT NOT NULL DEFAULT 'NONE',        -- NONE | ACTIVE | CANCELED | EXPIRED
    active               INTEGER NOT NULL DEFAULT 1,          -- 0/1
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_plan  ON users(plan);

-- ============ BETS ============
CREATE TABLE IF NOT EXISTS bets (
    id               TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    category         TEXT NOT NULL,                            -- SIMPLES | COMBINADO | MULTIPLO | SUPERODD
    sport            TEXT NOT NULL DEFAULT 'Futebol',
    competition      TEXT NOT NULL DEFAULT '',
    selections_json  TEXT NOT NULL DEFAULT '[]',               -- JSON array
    total_odd        REAL NOT NULL,
    probability      REAL,
    risk             TEXT NOT NULL DEFAULT 'MEDIO',            -- BAIXO | MEDIO | ALTO
    rationale        TEXT NOT NULL DEFAULT '',
    scheduled_at     TEXT,
    required_plan    TEXT NOT NULL DEFAULT 'FREE',             -- FREE | PRO | FULL
    external_url     TEXT,
    featured         INTEGER NOT NULL DEFAULT 0,
    image_url        TEXT,
    status           TEXT NOT NULL DEFAULT 'PENDENTE',         -- PENDENTE | GREEN | RED | VOID | CANCELADO
    published        INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status     ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_published  ON bets(published);
CREATE INDEX IF NOT EXISTS idx_bets_plan       ON bets(required_plan);

-- ============ PASSWORD RESET TOKENS ============
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    token_hash       TEXT NOT NULL,                            -- SHA-256 hex do token bruto
    expires_at       TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    used             INTEGER NOT NULL DEFAULT 0,
    used_at          TEXT,
    invalidated_at   TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_used       ON password_reset_tokens(used);

-- ============ KIWIFY EVENTS (dedupe) ============
CREATE TABLE IF NOT EXISTS kiwify_events (
    event_id     TEXT PRIMARY KEY,
    payload      TEXT NOT NULL,                                -- JSON
    received_at  TEXT NOT NULL
);

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
    id           TEXT PRIMARY KEY,
    admin_id     TEXT NOT NULL,
    admin_email  TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity       TEXT NOT NULL,
    entity_id    TEXT NOT NULL DEFAULT '',
    metadata     TEXT NOT NULL DEFAULT '{}',                   -- JSON
    created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin      ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs(action);
