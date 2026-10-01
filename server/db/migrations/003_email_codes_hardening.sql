-- v4.3.2: do not persist email verification codes in plaintext.
ALTER TABLE email_codes ADD COLUMN code_hash TEXT;
ALTER TABLE email_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;