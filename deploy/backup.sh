#!/bin/bash
set -euo pipefail
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30
mkdir -p "$BACKUP_DIR"
docker compose -f "$HOME/dpsg-reisekosten/docker-compose.prod.yml" exec -T db \
  pg_dump -U dpsg dpsg_reisekosten | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
echo "✓ Backup: $BACKUP_DIR/db_$DATE.sql.gz"
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$KEEP_DAYS -delete
