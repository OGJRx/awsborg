-- Migración 0004: Sesiones y Circuit Breaker
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Asegurar system_health (creada en 0003, pero para idempotencia)
INSERT OR IGNORE INTO system_health (key, value) VALUES ('gemini_blocked', 'false');
