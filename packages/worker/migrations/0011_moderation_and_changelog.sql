-- Migration number: 0011 	 2026-06-15T00:00:00.000Z
-- ADR 0023: moderation queue + append-only change log for reference data.

CREATE TABLE submissions (
  id            TEXT PRIMARY KEY,
  target        TEXT NOT NULL CHECK (target IN ('rates', 'zones', 'providers', 'modes')),
  operation     TEXT NOT NULL CHECK (operation IN ('create', 'update')),
  payload       TEXT NOT NULL,
  source        TEXT NOT NULL,
  submitted_by  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at  TEXT NOT NULL,
  reviewed_by   TEXT,
  reviewed_at   TEXT,
  review_note   TEXT
);

CREATE INDEX idx_submissions_status ON submissions (status, submitted_at);

CREATE TABLE change_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  target        TEXT NOT NULL,
  operation     TEXT NOT NULL,
  row_key       TEXT NOT NULL,
  before        TEXT,
  after         TEXT,
  source        TEXT NOT NULL,
  changed_by    TEXT NOT NULL,
  submission_id TEXT REFERENCES submissions(id),
  changed_at    TEXT NOT NULL
);

CREATE INDEX idx_change_log_target ON change_log (target, row_key, id);
