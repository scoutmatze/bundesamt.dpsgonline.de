# Setup-Anleitung

## Voraussetzungen

- Node.js 22+
- Docker & Docker Compose
- Git

## Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/[org]/dpsg-reisekosten.git
cd dpsg-reisekosten

# Dependencies installieren
npm install

# Environment einrichten
cp .env.example .env
# → .env ausfüllen

# Datenbank starten
docker compose up db -d

# Prisma Schema anwenden
npx prisma db push

# Development Server starten
npm run dev
```

## PDF-Generator testen

```bash
cd pdf-generator
pip install -r requirements.txt
python generate_reisekosten.py test_input.json output.pdf
```
