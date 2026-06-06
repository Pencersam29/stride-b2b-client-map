CREATE TABLE IF NOT EXISTS os_metrics (
  id SERIAL PRIMARY KEY,
  hc_outreach_this_week INTEGER NOT NULL DEFAULT 0,
  rh_outreach_this_week INTEGER NOT NULL DEFAULT 0,
  b2c_waitlist_signups INTEGER NOT NULL DEFAULT 0,
  b2c_referral_channels INTEGER NOT NULL DEFAULT 0,
  b2c_content_this_week INTEGER NOT NULL DEFAULT 0,
  framework_complete BOOLEAN NOT NULL DEFAULT false,
  pilot_proposals_sent INTEGER NOT NULL DEFAULT 0,
  content_published_total INTEGER NOT NULL DEFAULT 0,
  rh_fit_decision_made BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
