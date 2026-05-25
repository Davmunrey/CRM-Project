#!/bin/sh
# backup.sh — pg_dump every 6 hours, keep last 7 days
# Runs inside a postgres:16-alpine container via crond.

set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/n0crm_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup -> ${FILE}"

pg_dump \
  -h postgres \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --no-password \
  | gzip > "${FILE}"

echo "[$(date)] Backup complete: ${FILE} ($(du -sh "${FILE}" | cut -f1))"

# Retain only the last 7 days of backups
find "${BACKUP_DIR}" -maxdepth 1 -name "n0crm_*.sql.gz" -type f \
  -mtime +7 -delete

echo "[$(date)] Old backups pruned (retention: 7 days)"
