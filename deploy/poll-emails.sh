#!/bin/bash
# Polls IMAP for receipt emails via OAuth2
# Crontab: */5 * * * * /home/deploy/dpsg-reisekosten/deploy/poll-emails.sh
APP_DIR="$HOME/dpsg-reisekosten"
docker compose -f "$APP_DIR/docker-compose.prod.yml" exec -T app node /app/scripts/poll-emails.mjs \
  >> "$HOME/logs/email-poll.log" 2>&1
echo " [$(date +%H:%M:%S)]" >> "$HOME/logs/email-poll.log"
