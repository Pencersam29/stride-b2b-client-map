-- Weekly archive + reset for os_metrics
-- Snapshots current counters into history every Monday 00:00 America/Toronto,
-- then zeroes the *_this_week fields and per-week booleans.

CREATE TABLE IF NOT EXISTS os_metrics_history (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  hc_outreach_this_week INTEGER NOT NULL DEFAULT 0,
  rh_outreach_this_week INTEGER NOT NULL DEFAULT 0,
  b2c_waitlist_signups INTEGER NOT NULL DEFAULT 0,
  b2c_referral_channels INTEGER NOT NULL DEFAULT 0,
  b2c_content_this_week INTEGER NOT NULL DEFAULT 0,
  framework_complete BOOLEAN NOT NULL DEFAULT false,
  pilot_proposals_sent INTEGER NOT NULL DEFAULT 0,
  content_published_total INTEGER NOT NULL DEFAULT 0,
  rh_fit_decision_made BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS os_metrics_history_week_idx
  ON os_metrics_history (week_start_date DESC);

CREATE OR REPLACE FUNCTION archive_and_reset_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_start DATE := (date_trunc('week', (NOW() AT TIME ZONE 'America/Toronto') - INTERVAL '1 day'))::DATE;
BEGIN
  INSERT INTO os_metrics_history (
    source_id, week_start_date,
    hc_outreach_this_week, rh_outreach_this_week,
    b2c_waitlist_signups, b2c_referral_channels, b2c_content_this_week,
    framework_complete, pilot_proposals_sent,
    content_published_total, rh_fit_decision_made
  )
  SELECT
    id, v_week_start,
    hc_outreach_this_week, rh_outreach_this_week,
    b2c_waitlist_signups, b2c_referral_channels, b2c_content_this_week,
    framework_complete, pilot_proposals_sent,
    content_published_total, rh_fit_decision_made
  FROM os_metrics
  ON CONFLICT (source_id, week_start_date) DO NOTHING;

  UPDATE os_metrics
  SET
    hc_outreach_this_week = 0,
    rh_outreach_this_week = 0,
    b2c_content_this_week = 0,
    framework_complete = false,
    rh_fit_decision_made = false,
    updated_at = NOW();
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any previous schedule under this name (idempotent)
DO $$
DECLARE
  v_jobid BIGINT;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'weekly_os_metrics_archive';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Run every Monday 00:00 America/Toronto. pg_cron uses UTC, so:
--   EST (UTC-5) → Monday 05:00 UTC
--   EDT (UTC-4) → Monday 04:00 UTC
-- Schedule for 05:00 UTC; during DST it'll fire at 01:00 local — acceptable
-- since reset happens once per week. For exact 00:00 local year-round,
-- a Supabase Edge Function on cron is the alternative.
SELECT cron.schedule(
  'weekly_os_metrics_archive',
  '0 5 * * 1',
  $$SELECT archive_and_reset_metrics();$$
);
