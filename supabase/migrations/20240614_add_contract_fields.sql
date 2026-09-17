-- Track contract terms for Signed accounts: how many end-clients the
-- business agreed to, and the per-client monthly price + currency.
-- Used to compute ARR (price * client count * 12) per currency.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contracted_client_count integer,
  ADD COLUMN IF NOT EXISTS contract_price_monthly numeric,
  ADD COLUMN IF NOT EXISTS contract_currency text;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_contracted_client_count_check CHECK (contracted_client_count IS NULL OR contracted_client_count >= 0),
  ADD CONSTRAINT clients_contract_price_monthly_check CHECK (contract_price_monthly IS NULL OR contract_price_monthly >= 0);
