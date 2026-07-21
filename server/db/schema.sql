-- Bangmio 用户表（Cloudflare D1）
-- 在 D1 控制台或本地 `wrangler d1 execute bangmio-users --file=server/db/schema.sql` 执行

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  bgm_uid TEXT,
  bgm_token_encrypted TEXT,
  bgm_token_iv TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_bgm_uid ON users(bgm_uid);
