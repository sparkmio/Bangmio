-- v4.1.0: invalidate all existing sessions when password changes.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
