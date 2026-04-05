-- Block A: Verpflegung + Kilometer + Signatur
-- Ausführen: docker compose -f docker-compose.prod.yml exec -T db psql -U dpsg -d dpsg_reisekosten < migration-block-a.sql

-- Reisezeiten für Verpflegungspauschale
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "endTime"   TEXT;

-- Verpflegungspauschale Ergebnis (als JSON gespeichert)
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "verpflegungAmount" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "verpflegungData"   TEXT;  -- JSON: meals per day, deductions

-- Kilometerabrechnung
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "kmRate"   DOUBLE PRECISION DEFAULT 0.30;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "kmLegs"   TEXT;  -- JSON: [{from, to, km}]
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "kmTotal"  INTEGER DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "kmAmount" DOUBLE PRECISION DEFAULT 0;

-- Signatur als Data URL (canvas-gezeichnet)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signatureData" TEXT;

-- PKW-spezifische Felder
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "licensePlate" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "pkwReason"    TEXT;

-- Prüfung
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'Trip' AND column_name IN ('startTime','endTime','verpflegungAmount','kmRate','kmLegs','kmTotal','kmAmount')
ORDER BY column_name;
