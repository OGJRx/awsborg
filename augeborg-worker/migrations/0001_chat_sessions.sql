-- ============================================================
-- AUGEBORG WORKER - DATABASE SCHEMA v2.1
-- ============================================================

-- Chat Sessions Table
-- Stores active conversation sessions per user
CREATE TABLE IF NOT EXISTS chat_sessions (
    chat_id INTEGER PRIMARY KEY,
    model TEXT NOT NULL CHECK (model IN ('gemini', 'local')),
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Message History Table
-- Stores conversation history for context window
CREATE TABLE IF NOT EXISTS message_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chat_sessions(chat_id) ON DELETE CASCADE
);

-- Index for faster history queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_message_history_chat_created
ON message_history(chat_id, created_at DESC);

-- User Preferences Table (legacy support)
CREATE TABLE IF NOT EXISTS user_prefs (
    user_id INTEGER PRIMARY KEY,
    mode TEXT DEFAULT 'local',
    updated_at TEXT DEFAULT (datetime('now'))
);

-- System Health Table (optional monitoring)
CREATE TABLE IF NOT EXISTS system_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INTEGER,
    checked_at TEXT DEFAULT (datetime('now'))
);
