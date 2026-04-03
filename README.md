# DPSG Reisekosten-Tool

> Digitale Reise- und Sachkostenabrechnung für ehrenamtliche Gremienmitglieder der Deutschen Pfadfinderschaft Sankt Georg (DPSG) auf Bundesebene.

## Was ist das?

Ehrenamtliche der DPSG müssen regelmäßig Reisekosten abrechnen — bisher ein manueller, fehleranfälliger Prozess mit PDF-Formularen, Belegen und E-Mails. Dieses Tool digitalisiert den gesamten Workflow:

1. **Profil einmalig anlegen** (Name, Adresse, Bankverbindung, Unterschrift)
2. **Reise erstellen** (Zweck, Datum, Route, Reisemittel)
3. **Belege zuordnen** (Beträge, Kategorien, Handyticket-Markierung)
4. **PDF generieren** → Original-DPSG-Formulare automatisch ausgefüllt
5. **Versenden** an reisekosten@dpsg.de

## Features

- **Original-Formulare:** Die DPSG-PDFs werden direkt befüllt — kein Nachbau, sondern das echte Formular
- **Digitale Unterschrift:** Zeichnen oder als Bild hochladen, automatische Hintergrund-Entfernung
- **Automatischer Reiseweg:** Wird aus den Fahrtkosten-Belegen zusammengebaut
- **Regelwerk-Validierung:** 3-Monats-Frist, PKW-Begründung, Alkohol-Ausschluss, etc.
- **Geflattened PDF:** Ausgabe ist unveränderlich, aber maschinenlesbar (OCR-fähig)
- **DSGVO-konform:** Verschlüsselte Bankdaten, Hosting in Deutschland

## Unterstützte Formulare

| Formular | Status |
|----------|--------|
| Reisekostenabrechnung für Gremienmitglieder | ✅ Validiert |
| Erklärung Fahrt mit dem Handyticket | ✅ Validiert |
| Sachkostenabrechnung im Quartal | 🔲 Geplant |
| Bewirtungsaufwendungen | 🔲 Geplant |
| BahnCard-Antrag | 🔲 Geplant |
| Eigenbeleg | 🔲 Geplant |
| Vergabevermerk (UVgO) | 🔲 Geplant |

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Python (PDF-Generator) |
| Datenbank | PostgreSQL 16, Prisma ORM |
| Auth | NextAuth.js v5 (Magic Link) |
| PDF | pypdf, reportlab, python-docx, LibreOffice |
| Deployment | Docker Compose, Hetzner Cloud |

## Quickstart

```bash
# Repository klonen
git clone https://github.com/[org]/dpsg-reisekosten.git
cd dpsg-reisekosten

# Environment-Variablen
cp .env.example .env
# → .env ausfüllen (DB, SMTP, Encryption Key, etc.)

# Starten
docker compose up -d

# Datenbank migrieren
docker compose exec app npx prisma migrate deploy

# Öffnen
open https://localhost:3000
```

## Dokumentation

| Dokument | Beschreibung |
|----------|-------------|
| [KONZEPT.md](docs/KONZEPT.md) | Gesamtkonzept, Architektur, Datenmodell, Roadmap |
| [PDF-GENERATOR.md](docs/PDF-GENERATOR.md) | Technische Doku zum PDF-Befüllungsansatz |
| [SETUP.md](docs/SETUP.md) | Einrichtungsanleitung für Entwickler |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Produktions-Deployment auf Hetzner |
| [API.md](docs/API.md) | REST API Dokumentation |

## Grundlage

Dieses Tool basiert auf den Abrechnungsregeln des [Leitfaden zu Planung und Abrechnung](https://dpsg.de) (Stand Dezember 2025) des Bundesvorstands der DPSG.

## Lizenz

Proprietär — Bundesamt Sankt Georg e. V.

## Kontakt

Mathias Meyer — Digitale Infrastruktur DPSG
