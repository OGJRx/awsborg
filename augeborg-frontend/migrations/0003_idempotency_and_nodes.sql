DROP TABLE IF EXISTS processed_updates;
DROP TABLE IF EXISTS pending_tasks;
DROP TABLE IF EXISTS system_health;

CREATE TABLE processed_updates (
    message_id INTEGER PRIMARY KEY,
    inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pending_tasks (
    message_id INTEGER PRIMARY KEY,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_health (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inicializar estado del Circuit Breaker
INSERT INTO system_health (key, value) VALUES ('gemini_blocked', 'false');
