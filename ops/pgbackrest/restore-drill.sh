#!/usr/bin/env bash
# Dogan AI OS - production restore drill.
# Restores the latest pgBackRest backup into a temporary cluster on port 5499,
# verifies row count parity on the platform.tenants table, then tears down.
# Designed to run weekly via systemd timer; failure pages on-call.
set -euo pipefail

STANZA="${STANZA:-dogan_master}"
PG_VERSION="${PG_VERSION:-18}"
DRILL_DIR="${DRILL_DIR:-/var/lib/postgresql/restore-drill}"
DRILL_PORT="${DRILL_PORT:-5499}"
LOG=/var/log/pgbackrest/restore-drill-$(date +%Y%m%d-%H%M%S).log
install -d -o postgres -g postgres -m 0750 /var/log/pgbackrest
touch "$LOG" && chown postgres:postgres "$LOG" && chmod 0640 "$LOG"

trap 'echo "RESTORE DRILL: aborted" | tee -a "$LOG" >&2' ERR

echo "[$(date -Is)] restore drill start (stanza=$STANZA)" | tee "$LOG"

if [[ -d "$DRILL_DIR" ]]; then
  /usr/lib/postgresql/${PG_VERSION}/bin/pg_ctl -D "$DRILL_DIR" stop -m immediate 2>/dev/null || true
  rm -rf "$DRILL_DIR"
fi
install -d -o postgres -g postgres -m 0700 "$DRILL_DIR"

sudo -u postgres /usr/bin/pgbackrest \
  --stanza="$STANZA" \
  --pg1-path="$DRILL_DIR" \
  --type=immediate \
  --target-action=promote \
  restore | tee -a "$LOG"

# Self-contained config (Debian PG layout keeps postgresql.conf in /etc).
cat > "$DRILL_DIR/postgresql.conf" <<EOF
port = $DRILL_PORT
unix_socket_directories = '/tmp'
listen_addresses = '127.0.0.1'
archive_mode = off
hba_file = '$DRILL_DIR/pg_hba.conf'
ident_file = '$DRILL_DIR/pg_ident.conf'
data_directory = '$DRILL_DIR'
shared_buffers = 256MB
max_connections = 200
max_wal_senders = 10
max_worker_processes = 16
max_locks_per_transaction = 128
max_prepared_transactions = 0
EOF
cat > "$DRILL_DIR/pg_hba.conf" <<'EOF'
local all all trust
host  all all 127.0.0.1/32 trust
EOF
: > "$DRILL_DIR/pg_ident.conf"
chown -R postgres:postgres "$DRILL_DIR"

sudo -u postgres /usr/lib/postgresql/${PG_VERSION}/bin/pg_ctl -D "$DRILL_DIR" \
  -o "-c config_file=$DRILL_DIR/postgresql.conf" \
  -l "$LOG" -w -t 60 start

EXPECTED=$(sudo -u postgres psql -p 5432 -At -d "$STANZA" \
  -c "select count(*) from platform.tenants")
GOT=$(sudo -u postgres psql -p $DRILL_PORT -At -h /tmp -d "$STANZA" \
  -c "select count(*) from platform.tenants")

sudo -u postgres /usr/lib/postgresql/${PG_VERSION}/bin/pg_ctl \
  -D "$DRILL_DIR" stop -m fast || true
rm -rf "$DRILL_DIR"

if [[ "$EXPECTED" != "$GOT" ]]; then
  echo "RESTORE DRILL FAILED: tenants expected=$EXPECTED got=$GOT" | tee -a "$LOG" >&2
  exit 1
fi

echo "[$(date -Is)] restore drill OK: tenants=$GOT" | tee -a "$LOG"
