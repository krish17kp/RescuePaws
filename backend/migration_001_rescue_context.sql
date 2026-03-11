-- Migration: Add rescue coordination fields
-- Run: psql -U postgres -d rescue_uber -f backend/migration_001_rescue_context.sql

-- Add rescue context fields to cases
ALTER TABLE cases ADD COLUMN IF NOT EXISTS locality TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS access_instructions TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS animal_condition VARCHAR(30);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS hazard_info TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reporter_availability VARCHAR(20) DEFAULT 'on_site';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP DEFAULT NOW();

-- Case photos (URLs from Cloudinary, no local storage)
CREATE TABLE IF NOT EXISTS case_photos (
  id          SERIAL PRIMARY KEY,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  photo_type  VARCHAR(20) NOT NULL CHECK (photo_type IN ('animal', 'scene', 'landmark')),
  file_url    TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Case timeline events (quick updates, status changes, movement)
CREATE TABLE IF NOT EXISTS case_events (
  id          SERIAL PRIMARY KEY,
  case_id     INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  user_role   VARCHAR(20) NOT NULL,
  event_type  VARCHAR(30) NOT NULL CHECK (event_type IN ('status_change', 'quick_update', 'movement', 'photo', 'location_update', 'system')),
  message     TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_photos_case ON case_photos(case_id);
