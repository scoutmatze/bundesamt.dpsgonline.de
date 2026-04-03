#!/bin/bash
set -euo pipefail
APP_DIR="$HOME/dpsg-reisekosten"
COMPOSE="docker-compose.prod.yml"
echo "═══ DPSG Reisekosten — Deploy ═══"
cd "$APP_DIR"
echo "[1/5] Code aktualisieren..."
git pull origin main
echo "[2/5] Docker Image bauen..."
docker compose -f "$COMPOSE" build app
echo "[3/5] Datenbank migrieren..."
docker compose -f "$COMPOSE" run --rm app npx prisma migrate deploy
echo "[4/5] Services starten..."
docker compose -f "$COMPOSE" up -d
echo "[5/5] Alte Images aufraeumen..."
docker image prune -f
echo ""
echo "✓ Deploy abgeschlossen! → https://bundesamt.dpsgonline.de"
