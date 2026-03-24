-- Chat Sessions Table
-- Stores active conversation sessions per user
CREATE TABLE IF NOT EXISTS chat_sessions (
    chat_id INTEGER PRIMARY KEY,
    model TEXT NOT NULL, -- 'gemini' or 'local'
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Message History Table
-- Stores conversation history for context
CREATE TABLE IF NOT EXISTS message_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chat_sessions(chat_id) ON DELETE CASCADE
);

-- Index for faster history queries
CREATE INDEX IF NOT EXISTS idx_message_history_chat_id ON message_history(chat_id, created_at DESC);

-- Ensure user_prefs table exists (from previous schema)
CREATE TABLE IF NOT EXISTS user_prefs (
    user_id INTEGER PRIMARY KEY,
    mode TEXT DEFAULT 'local',
    updated_at TEXT DEFAULT (datetime('now'))
);
