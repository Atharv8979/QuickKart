ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS agreed_price DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS negotiation_history JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN ('ACTIVE', 'BARGAINING', 'ACCEPTED', 'REJECTED', 'CONFIRMED', 'CLOSED', 'EXPIRED'));
