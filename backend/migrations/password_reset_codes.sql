-- ============================================================================
--  QuickKart — Password Reset Codes (Email OTP)
--  Run this ONCE in the Supabase SQL Editor (Dashboard -> SQL Editor -> Run).
-- ============================================================================
--
--  Security notes:
--   * Only a bcrypt HASH of the 6-digit code is stored — never the plaintext.
--   * Codes expire (default 10 minutes) and are capped at 5 verify attempts.
--   * A code is single-use: `used_at` is stamped on successful verification.
--   * All previous codes for an email are voided when a new one is issued.
-- ============================================================================

create table if not exists public.password_reset_codes (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,
  code_hash     text        not null,
  expires_at    timestamptz not null,
  attempts      integer     not null default 0,
  max_attempts  integer     not null default 5,
  used_at       timestamptz,
  request_ip    text,
  created_at    timestamptz not null default now()
);

-- Fast lookup of the newest active code for an email
create index if not exists password_reset_codes_email_created_idx
  on public.password_reset_codes (email, created_at desc);

-- Optional housekeeping index for purging expired rows
create index if not exists password_reset_codes_expires_idx
  on public.password_reset_codes (expires_at);

-- The backend connects with the SERVICE ROLE key, which bypasses RLS.
-- RLS is enabled below purely to block any accidental public/anon access.
alter table public.password_reset_codes enable row level security;

-- No policies are created, so anon/authenticated roles get zero access.
-- The service role key used by the backend ignores RLS entirely.

-- Optional: purge codes older than 24h (run manually or via a cron job)
-- delete from public.password_reset_codes where created_at < now() - interval '24 hours';
