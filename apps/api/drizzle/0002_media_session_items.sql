PRAGMA foreign_keys = ON;

CREATE TABLE media_session_items (
  id TEXT PRIMARY KEY NOT NULL,
  media_session_id TEXT NOT NULL REFERENCES media_sessions(id),
  sort_order INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_decision TEXT,
  moderation_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX media_session_items_session_idx
  ON media_session_items (media_session_id);

CREATE UNIQUE INDEX media_session_items_order_uq
  ON media_session_items (media_session_id, sort_order);
