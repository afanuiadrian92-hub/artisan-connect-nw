-- Run this file once to create all tables
-- psql -U trustlink_user -d trustlink_db -f server/db/schema.sql

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('customer','artisan','admin')),
  phone         VARCHAR(20),
  quarter       VARCHAR(100),
  division      VARCHAR(100),
  avatar_initials VARCHAR(3),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE artisan_profiles (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio                 TEXT,
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available','busy','unavailable')),
  trust_score         INTEGER DEFAULT 0,
  avg_rating          DECIMAL(3,2) DEFAULT 0,
  total_jobs          INTEGER DEFAULT 0,
  response_rate       INTEGER DEFAULT 100,
  lat                 DECIMAL(10, 8), -- latitude from Nominatim geocoding
  lon                 DECIMAL(11, 8), -- longitude from Nominatim geocoding
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL,
  icon  VARCHAR(50)
);

CREATE TABLE artisan_services (
  id            SERIAL PRIMARY KEY,
  artisan_id    INTEGER REFERENCES artisan_profiles(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES service_categories(id),
  title         VARCHAR(100) NOT NULL,
  description   TEXT,
  rate_per_hour INTEGER NOT NULL
);

CREATE TABLE verification_documents (
  id                SERIAL PRIMARY KEY,
  artisan_id        INTEGER REFERENCES artisan_profiles(id) ON DELETE CASCADE,
  doc_name          VARCHAR(100) NOT NULL,
  file_url          VARCHAR(500) NOT NULL,
  status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  rejection_reason  TEXT,
  expiry_date       DATE,
  uploaded_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE job_posts (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id  INTEGER REFERENCES service_categories(id),
  title        VARCHAR(150) NOT NULL,
  description  TEXT,
  quarter      VARCHAR(100),
  division     VARCHAR(100),
  budget_min   INTEGER,
  budget_max   INTEGER,
  status       VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','quoted','booked','closed')),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quotes (
  id              SERIAL PRIMARY KEY,
  job_id          INTEGER REFERENCES job_posts(id) ON DELETE CASCADE,
  artisan_id      INTEGER REFERENCES artisan_profiles(id),
  price           INTEGER NOT NULL,
  message         TEXT,
  estimated_hours INTEGER,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id             SERIAL PRIMARY KEY,
  job_id         INTEGER REFERENCES job_posts(id),
  quote_id       INTEGER REFERENCES quotes(id),
  customer_id    INTEGER REFERENCES users(id),
  artisan_id     INTEGER REFERENCES artisan_profiles(id),
  status         VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed','in-progress','completed','cancelled')),
  scheduled_date DATE,
  scheduled_time TIME,
  location       TEXT,
  total_amount   INTEGER NOT NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id                 SERIAL PRIMARY KEY,
  booking_id         INTEGER UNIQUE REFERENCES bookings(id),
  amount             INTEGER NOT NULL,
  currency           VARCHAR(10) DEFAULT 'XAF',
  method             VARCHAR(30) DEFAULT 'mtn_momo',
  status             VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  momo_transaction_id VARCHAR(100),
  created_at         TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER UNIQUE REFERENCES bookings(id),
  customer_id INTEGER REFERENCES users(id),
  artisan_id  INTEGER REFERENCES artisan_profiles(id),
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50),
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_logs (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id   INTEGER,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Seed service categories
INSERT INTO service_categories (name, icon) VALUES
  ('Plumbing',   'droplets'),
  ('Electrical', 'zap'),
  ('Solar',      'sun'),
  ('Mechanic',   'car'),
  ('Laundry',    'shopping-basket'),
  ('HVAC',       'wind'),
  ('Tailoring',  'scissors'),
  ('Home Care',  'home');