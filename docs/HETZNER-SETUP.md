# Hetzner Cloud Server — Schritt-für-Schritt-Anleitung

## Übersicht

```
Dein Rechner                   Hetzner Cloud                    Internet
┌──────────┐     SSH          ┌─────────────────────┐         ┌─────────┐
│ Terminal  │ ──────────────→ │ CX22 (Ubuntu 24.04) │ ←────── │ Browser │
│ Git Push  │                 │                     │         │ User    │
└──────────┘                  │  ┌── Traefik ────┐  │         └─────────┘
                              │  │ :80 → :443    │  │
                              │  │ Let's Encrypt │  │
                              │  └──────┬────────┘  │
                              │         │           │
                              │  ┌──────▼────────┐  │
                              │  │  Next.js App  │  │
                              │  │  :3000        │  │
                              │  └──────┬────────┘  │
                              │         │           │
                              │  ┌──────▼────────┐  │
                              │  │  PostgreSQL   │  │
                              │  │  :5432        │  │
                              │  └───────────────┘  │
                              └─────────────────────┘
```

**Zeitaufwand:** ~30 Minuten
**Kosten:** 4,85 €/Monat (CX22)

---

## Teil 1: Hetzner Account & Server erstellen

### 1.1 Account erstellen

1. Öffne **https://console.hetzner.cloud/register**
2. Registriere dich (E-Mail, Passwort, Zahlungsmethode)
3. Bestätige deine E-Mail

### 1.2 Projekt erstellen

1. Klicke **"Neues Projekt"**
2. Name: `DPSG Reisekosten`
3. Klicke **"Erstellen"**

### 1.3 SSH-Key hinterlegen

Bevor du den Server erstellst, brauchst du einen SSH-Key:

```bash
# Auf deinem lokalen Rechner (PowerShell / Terminal):
ssh-keygen -t ed25519 -C "mathias@dpsgonline.de"

# Enter drücken (Standard-Pfad)
# Passwort optional setzen

# Public Key anzeigen:
cat ~/.ssh/id_ed25519.pub
# → Diesen Text kopieren
```

In der Hetzner Console:
1. Links: **Security** → **SSH-Keys** → **SSH-Key hinzufügen**
2. Den kopierten Public Key einfügen
3. Name: `Mathias Laptop` (o.ä.)

### 1.4 Server erstellen

1. Links: **Server** → **Server hinzufügen**
2. Einstellungen:

| Einstellung | Wert |
|-------------|------|
| **Standort** | Falkenstein (fsn1) oder Nürnberg (nbg1) — beides DE |
| **Image** | Ubuntu 24.04 |
| **Typ** | CX22 (Shared vCPU, 2 vCPU, 4 GB RAM, 40 GB SSD) |
| **Netzwerk** | Standard (Public IPv4 + IPv6) |
| **SSH-Key** | Den eben erstellten Key auswählen ☑ |
| **Name** | `dpsg-reisekosten` |

3. Klicke **"Jetzt kostenpflichtig erstellen"**
4. **Notiere dir die IP-Adresse** (z.B. `88.99.123.456`)

---

## Teil 2: DNS einrichten

Gehe zu deinem DNS-Provider für `dpsgonline.de` und erstelle:

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| **A** | `bundesamt` | `88.99.123.456` (deine Server-IP) | 300 |
| **AAAA** | `bundesamt` | (IPv6 aus Hetzner Console) | 300 |

**Test** (nach 5 Minuten):
```bash
nslookup bundesamt.dpsgonline.de
# Sollte deine Server-IP zurückgeben
```

---

## Teil 3: Server einrichten

### 3.1 Einloggen

```bash
ssh root@88.99.123.456
# Beim ersten Mal: "Are you sure?" → yes
```

### 3.2 Init-Script ausführen

```bash
# Script herunterladen und ausführen
curl -fsSL https://raw.githubusercontent.com/DEIN-USER/dpsg-reisekosten/main/deploy/server-init.sh -o /tmp/init.sh

# ODER: Script manuell kopieren (falls Repo noch nicht öffentlich)
nano /tmp/init.sh
# → Inhalt von deploy/server-init.sh einfügen

chmod +x /tmp/init.sh
bash /tmp/init.sh
```

Das Script macht:
- System-Update
- Docker installieren
- Benutzer `deploy` erstellen
- SSH absichern (Root-Login deaktivieren)
- Firewall (nur 22, 80, 443)
- Fail2Ban (Brute-Force-Schutz)
- Automatische Sicherheitsupdates

### 3.3 SSH-Key für deploy-User

```bash
# Auf deinem LOKALEN Rechner:
ssh-copy-id deploy@88.99.123.456

# Testen:
ssh deploy@88.99.123.456
# → Sollte ohne Passwort funktionieren
```

**WICHTIG:** Ab jetzt nur noch als `deploy` einloggen, nicht mehr als `root`!

---

## Teil 4: App deployen

### 4.1 Projekt klonen

```bash
# Als deploy-User auf dem Server:
ssh deploy@88.99.123.456

cd ~
git clone https://github.com/DEIN-USER/dpsg-reisekosten.git
cd dpsg-reisekosten
```

### 4.2 Environment einrichten

```bash
cp .env.example .env
nano .env
```

Fülle die Werte aus:

```env
# Datenbank (Passwort generieren)
DB_PASSWORD=HIER_SICHERES_PASSWORT

# NextAuth
NEXTAUTH_URL=https://bundesamt.dpsgonline.de
NEXTAUTH_SECRET=HIER_SECRET_GENERIEREN

# Verschlüsselung
ENCRYPTION_KEY=HIER_HEX_KEY_GENERIEREN

# ACME (Let's Encrypt)
ACME_EMAIL=mathias@dpsgonline.de

# SMTP (für Magic Link Login)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@dpsgonline.de
SMTP_PASSWORD=HIER_SMTP_PASSWORT
SMTP_FROM=DPSG Reisekosten <noreply@dpsgonline.de>
```

**Secrets generieren:**
```bash
# NEXTAUTH_SECRET:
openssl rand -base64 32

# ENCRYPTION_KEY:
openssl rand -hex 32

# DB_PASSWORD:
openssl rand -base64 24
```

### 4.3 Starten

```bash
# Build + Start
docker compose -f docker-compose.prod.yml up -d

# Status prüfen
docker compose -f docker-compose.prod.yml ps

# Logs ansehen
docker compose -f docker-compose.prod.yml logs -f app
```

### 4.4 Datenbank initialisieren

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### 4.5 Prüfen

Öffne im Browser: **https://bundesamt.dpsgonline.de**

Du solltest sehen:
- ✅ HTTPS (grünes Schloss)
- ✅ Die App lädt

---

## Teil 5: Automatisierung

### 5.1 Backup-Cronjob

```bash
# Als deploy-User:
crontab -e

# Zeile einfügen (Backup täglich um 3:00 Uhr):
0 3 * * * /home/deploy/dpsg-reisekosten/deploy/backup.sh >> /home/deploy/backups/cron.log 2>&1
```

### 5.2 Deployment bei neuen Commits

Bei jedem neuen Feature:

```bash
# Auf deinem lokalen Rechner:
git push origin main

# Auf dem Server (oder per SSH):
ssh deploy@88.99.123.456 "cd ~/dpsg-reisekosten && bash deploy/deploy.sh"
```

**Optional:** GitHub Actions Auto-Deploy (in Phase 5, wenn stabil).

---

## Checkliste

- [ ] Hetzner Account erstellt
- [ ] SSH-Key generiert und in Hetzner hinterlegt
- [ ] Server CX22 erstellt (Ubuntu 24.04)
- [ ] Server-IP notiert
- [ ] DNS A-Record `bundesamt.dpsgonline.de` → Server-IP
- [ ] `server-init.sh` auf dem Server ausgeführt
- [ ] SSH-Key für `deploy`-User kopiert
- [ ] Root-Login per SSH deaktiviert
- [ ] Repo geklont auf dem Server
- [ ] `.env` mit echten Secrets befüllt
- [ ] `docker compose -f docker-compose.prod.yml up -d`
- [ ] Prisma Migration ausgeführt
- [ ] https://bundesamt.dpsgonline.de erreichbar
- [ ] Backup-Cronjob eingerichtet

---

## Troubleshooting

**SSL-Zertifikat wird nicht ausgestellt:**
```bash
# DNS prüfen
dig bundesamt.dpsgonline.de +short
# Muss die Server-IP zeigen

# Traefik Logs
docker compose -f docker-compose.prod.yml logs traefik
```

**App startet nicht:**
```bash
docker compose -f docker-compose.prod.yml logs app
# Häufig: .env fehlt oder falsche DB-URL
```

**Datenbank-Verbindung fehlgeschlagen:**
```bash
# DB-Container läuft?
docker compose -f docker-compose.prod.yml ps db
# DB_PASSWORD in .env identisch?
```

**Port 80/443 nicht erreichbar:**
```bash
sudo ufw status
# Sollte 80/tcp und 443/tcp ALLOW zeigen
```
