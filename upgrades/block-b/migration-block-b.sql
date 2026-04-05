-- Block B: Sachkosten, Bewirtung, BahnCard
-- Ausführen: docker compose -f docker-compose.prod.yml exec -T db psql -U dpsg -d dpsg_reisekosten < migration-block-b.sql

-- ══════════════════════════════════════════
-- Sachkostenabrechnung (pro Quartal)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "Sachkosten" (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  quarter     INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status      TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, SUBMITTED
  notes       TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId", year, quarter)
);

CREATE TABLE IF NOT EXISTS "SachkostenItem" (
  id              TEXT PRIMARY KEY,
  "sachkostenId"  TEXT NOT NULL REFERENCES "Sachkosten"(id) ON DELETE CASCADE,
  date            TIMESTAMP NOT NULL,
  description     TEXT NOT NULL,
  amount          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fileName"      TEXT,
  "filePath"      TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- Bewirtungsaufwendungen
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "Bewirtung" (
  id              TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "tripId"        TEXT REFERENCES "Trip"(id) ON DELETE SET NULL,
  date            TIMESTAMP NOT NULL,
  location        TEXT NOT NULL,         -- Restaurant / Ort
  occasion        TEXT NOT NULL,         -- Anlass der Bewirtung
  participants    TEXT NOT NULL,         -- Teilnehmer (Name, Firma)
  amountFood      DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Speisen
  amountDrinks    DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Getränke
  amountTip       DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Trinkgeld
  amountTotal     DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Gesamt
  notes           TEXT,
  "fileName"      TEXT,                  -- Bewirtungsbeleg-Scan
  "filePath"      TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- BahnCard-Antrag (pro Jahr)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "BahnCard" (
  id              TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  "cardType"      TEXT NOT NULL DEFAULT 'BC50',  -- BC25, BC50, BC100
  class           INTEGER NOT NULL DEFAULT 2,     -- 1 oder 2
  cost            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "validFrom"     TIMESTAMP,
  "validTo"       TIMESTAMP,
  "bahnCardNr"    TEXT,
  justification   TEXT,                  -- Begründung
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, SUBMITTED, APPROVED
  "fileName"      TEXT,                  -- Scan der BahnCard
  "filePath"      TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("userId", year)
);

-- Prüfung
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Sachkosten','SachkostenItem','Bewirtung','BahnCard');
