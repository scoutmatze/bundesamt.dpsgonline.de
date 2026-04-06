-- Paket 3: Usability
-- Gremium-Feld für User-Profil (wird in allen PDFs gebraucht)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gremium" TEXT;

-- Prüfung
SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'gremium';
