-- Migration number: 0011 	 2026-06-15T00:00:00.000Z
-- ADR 0023: D1 becomes the operational source of truth for reference data.
-- Contributions arrive as submissions into a moderation queue; a moderator approves
-- them online, the change is applied to the reference table, and every applied change
-- is recorded in an append-only change log (the provenance that git history used to
-- provide). ADR 0024: this concerns reference data only — never personal data.

-- The moderation queue: a proposed create/update to a reference table, awaiting review.
-- payload is the proposed row as JSON. source is the provenance the submitter asserts
-- (e.g. "Mololine parcel desk, self-reported 2026-06-15"). submitted_by identifies the
-- contributor or provider.
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

-- The append-only provenance log. One row per applied change. before/after are JSON
-- snapshots of the affected reference row (before is null for a create). row_key
-- identifies the affected row within its target table. submission_id links back to the
-- approved submission (null is allowed for direct/seed changes made outside the queue).
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
