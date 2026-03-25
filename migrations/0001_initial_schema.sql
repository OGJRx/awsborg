-- ============================================================
-- MIGRATION: Initial Schema for Frankenstein Architecture
-- ============================================================
-- D1 Database: AWS-BORG-DATA
-- PROHIBITIONS: NO KV, NO R2
-- ============================================================

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL UNIQUE,
  model TEXT NOT NULL DEFAULT 'gemini',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Message History Table
CREATE TABLE IF NOT EXISTS message_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chat_sessions(chat_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_chat_id ON chat_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(active);
CREATE INDEX IF NOT EXISTS idx_message_history_chat_id ON message_history(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_history_created_at ON message_history(created_at);

-- System State Table (for codespace status, tunnel URL, etc.)
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Initial system state
INSERT OR IGNORE INTO system_state (key, value) VALUES 
  ('codespace_status', 'unknown'),
  ('llama_url', ''),
  ('last_health_check', '');
