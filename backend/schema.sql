-- Rescue-Uber MVP Schema
-- Run once: psql -d rescue_uber -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('victim', 'responder', 'admin')),
  is_online     BOOLEAN DEFAULT false,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id              SERIAL PRIMARY KEY,
  victim_id       INTEGER NOT NULL REFERENCES users(id),
  responder_id    INTEGER REFERENCES users(id),
  emergency_type  VARCHAR(50) NOT NULL,
  description     TEXT,
  victim_lat      DOUBLE PRECISION NOT NULL,
  victim_lng      DOUBLE PRECISION NOT NULL,
  responder_lat   DOUBLE PRECISION,
  responder_lng   DOUBLE PRECISION,
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','assigned','in_progress','resolved','cancelled')),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responder_locations (
  id            SERIAL PRIMARY KEY,
  responder_id  INTEGER NOT NULL REFERENCES users(id),
  case_id       INTEGER NOT NULL REFERENCES cases(id),
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  recorded_at   TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_victim ON cases(victim_id);
CREATE INDEX IF NOT EXISTS idx_responder_locations_case ON responder_locations(case_id);
