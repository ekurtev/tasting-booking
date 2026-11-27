-- Core schema for the public booking flow.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE app_meta (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug       text NOT NULL UNIQUE,
  city       text NOT NULL,
  name       text NOT NULL,
  address    text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE consultants (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text NOT NULL UNIQUE,
  name           text NOT NULL,
  location_id    integer NOT NULL REFERENCES locations(id),
  buffer_minutes integer NOT NULL DEFAULT 15 CHECK (buffer_minutes BETWEEN 0 AND 240),
  active         boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0
);

CREATE TABLE tasting_types (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description      text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  price_cents      integer NOT NULL CHECK (price_cents >= 0),
  active           boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Weekly working hours in Europe/Sofia wall-clock time. Several intervals per day are allowed.
CREATE TABLE weekly_hours (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consultant_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  iso_weekday   smallint NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  CHECK (end_time > start_time),
  UNIQUE (consultant_id, iso_weekday, start_time)
);

CREATE TABLE days_off (
  consultant_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  day           date NOT NULL,
  note          text NOT NULL DEFAULT '',
  PRIMARY KEY (consultant_id, day)
);

CREATE TYPE booking_status AS ENUM ('confirmed', 'completed', 'no_show', 'cancelled');

CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id     integer NOT NULL REFERENCES consultants(id),
  tasting_type_id   integer NOT NULL REFERENCES tasting_types(id),
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  -- ends_at + consultant buffer; the consultant is unavailable for [starts_at, blocked_until).
  blocked_until     timestamptz NOT NULL,
  customer_name     text NOT NULL CHECK (length(customer_name) BETWEEN 2 AND 100),
  customer_phone    text NOT NULL CHECK (length(customer_phone) BETWEEN 6 AND 30),
  customer_email    text NOT NULL CHECK (length(customer_email) BETWEEN 3 AND 254),
  guests            integer CHECK (guests BETWEEN 1 AND 50),
  note              text CHECK (length(note) <= 1000),
  consent_at        timestamptz NOT NULL,
  status            booking_status NOT NULL DEFAULT 'confirmed',
  cancel_token_hash text NOT NULL UNIQUE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  cancelled_at      timestamptz,
  CHECK (ends_at > starts_at),
  CHECK (blocked_until >= ends_at),
  -- The double-booking guard: two active bookings of one consultant can never overlap.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
    consultant_id WITH =,
    tstzrange(starts_at, blocked_until, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX bookings_consultant_starts_idx ON bookings (consultant_id, starts_at);
