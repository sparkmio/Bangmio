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

-- 邮箱验证码表（注册/找回密码等场景）
-- 同一邮箱 + purpose 1 分钟内仅允许 1 条有效记录（应用层控制）
-- 验证码为 6 位数字字符串，10 分钟过期，使用后置为 consumed=1
CREATE TABLE IF NOT EXISTS email_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_codes_lookup ON email_codes(email, purpose, consumed, expires_at);
