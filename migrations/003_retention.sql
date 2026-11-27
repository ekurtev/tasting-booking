-- 12-month retention (privacy policy): customer fields of old bookings are anonymised by the app's
-- daily job (src/lib/retention.ts). The row itself stays for statistics; constraints are unchanged.
ALTER TABLE bookings ADD COLUMN anonymized_at timestamptz;

CREATE INDEX bookings_retention_idx ON bookings (starts_at) WHERE anonymized_at IS NULL;
