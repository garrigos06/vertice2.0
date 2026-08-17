-- Vértice Sports
-- Funil de aquisição Free / amostra pública
--
-- Adiciona suporte para selecionar UM bilhete FREE
-- como amostra pública acessível sem autenticação.

ALTER TABLE bets
ADD COLUMN is_public_preview INTEGER NOT NULL DEFAULT 0;


-- =========================================================
-- GARANTIA: no máximo uma amostra pública ativa por vez
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_single_public_preview
ON bets(is_public_preview)
WHERE is_public_preview = 1;


-- =========================================================
-- GARANTIA: somente bilhete FREE pode ser amostra pública
-- =========================================================

CREATE TRIGGER IF NOT EXISTS trg_bets_public_preview_insert
BEFORE INSERT ON bets
WHEN NEW.is_public_preview = 1
AND NEW.required_plan != 'FREE'
BEGIN
    SELECT RAISE(
        ABORT,
        'Apenas bilhetes FREE podem ser amostra pública'
    );
END;


CREATE TRIGGER IF NOT EXISTS trg_bets_public_preview_update
BEFORE UPDATE OF is_public_preview, required_plan ON bets
WHEN NEW.is_public_preview = 1
AND NEW.required_plan != 'FREE'
BEGIN
    SELECT RAISE(
        ABORT,
        'Apenas bilhetes FREE podem ser amostra pública'
    );
END;


-- =========================================================
-- ÍNDICE AUXILIAR
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_bets_public_preview
ON bets(is_public_preview);
