#!/bin/bash
# Polls IMAP inbox for receipt emails
# Crontab: */5 * * * * /home/deploy/dpsg-reisekosten/deploy/poll-emails.sh

APP_DIR="$HOME/dpsg-reisekosten"

# Load env vars
set -a
source "$APP_DIR/.env"
set +a

# Build DATABASE_URL from DB_PASSWORD
export DATABASE_URL="postgresql://dpsg:${DB_PASSWORD}@localhost:5432/dpsg_reisekosten"

# Run poller (needs access to DB directly, not through Docker network)
# So we expose DB port temporarily or use docker exec
docker compose -f "$APP_DIR/docker-compose.prod.yml" exec -T app node /app/scripts/poll-emails.mjs \
  >> "$HOME/logs/email-poll.log" 2>&1
