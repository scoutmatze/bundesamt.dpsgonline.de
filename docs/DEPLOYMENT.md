# Deployment

Für die vollständige Schritt-für-Schritt-Anleitung siehe:

→ **[HETZNER-SETUP.md](HETZNER-SETUP.md)**

## Quick Reference

```bash
# Server: Ersteinrichtung (als root)
bash deploy/server-init.sh

# App: Erstmaliges Deployment (als deploy)
git clone https://github.com/DEIN-USER/dpsg-reisekosten.git
cd dpsg-reisekosten
cp .env.example .env && nano .env
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# App: Update-Deployment (als deploy)
bash deploy/deploy.sh

# Backup manuell
bash deploy/backup.sh

# Logs
docker compose -f docker-compose.prod.yml logs -f app
```
