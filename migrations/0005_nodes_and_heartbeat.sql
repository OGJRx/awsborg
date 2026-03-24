-- Migration: 0005_nodes_and_heartbeat.sql
-- Gestión de nodos distribuidos (EC2) y salud del sistema.

CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    load INTEGER DEFAULT 0,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta TEXT
);

-- Asegurar que system_health existe; si ya existe, añadimos status si falta
CREATE TABLE IF NOT EXISTS system_health_new (
    key TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO system_health_new (key, status, updated_at)
SELECT key, 'green', updated_at FROM system_health;

DROP TABLE IF EXISTS system_health;
ALTER TABLE system_health_new RENAME TO system_health;
