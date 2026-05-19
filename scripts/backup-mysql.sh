#!/usr/bin/env sh
# MySQL logical backup. Run via cron on the host or in a sidecar container.
# Example: 0 2 * * * /app/scripts/backup-mysql.sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-mib_server}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/${MYSQL_DATABASE}_${STAMP}.sql.gz"

mysqldump -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  --single-transaction --routines --triggers "$MYSQL_DATABASE" | gzip > "$FILE"

find "$BACKUP_DIR" -name "${MYSQL_DATABASE}_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "Backup written: $FILE"
