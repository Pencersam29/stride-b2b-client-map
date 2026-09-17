-- Add lead temperature, lead source, activity log, and follow-up tracking to clients.
-- Existing rows default to lead_temperature = 'Warm' to preserve their status as
-- manually researched/contacted accounts.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lead_temperature text NOT NULL DEFAULT 'Warm',
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS notes_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_contacted_date date,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date;

UPDATE public.clients SET lead_temperature = 'Warm' WHERE lead_temperature IS NULL;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_lead_temperature_check CHECK (lead_temperature IN ('Warm', 'Cold'));
