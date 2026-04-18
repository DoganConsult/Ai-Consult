#!/usr/bin/env bash
# Dogan AI OS - environment snapshot.
# Captures every package, version, systemd unit, drop-in, configuration file,
# and runtime fact required to rebuild the platform identically on a new host.
# Output: ops/inventory/out/<timestamp>/  (JSON + raw artifacts)
# The latest run is also mirrored to ops/inventory/latest/ for git tracking.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/Ai-Consult-Microservices}"
OUT_ROOT="${REPO_DIR}/ops/inventory/out"
LATEST="${REPO_DIR}/ops/inventory/latest"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_ROOT}/${TS}"
install -d -m 0755 "$OUT" "$OUT/systemd" "$OUT/dropins" "$OUT/configs" "$LATEST"

note() { printf '[%s] %s\n' "$(date -Is)" "$*"; }

# ---------- 1. host facts ----------
note "host facts"
{
  echo "# host"
  hostnamectl 2>/dev/null || true
  echo "# kernel"; uname -a
  echo "# os-release"; cat /etc/os-release 2>/dev/null || true
  echo "# cpu"; nproc; lscpu | grep -E 'Model name|Architecture|Socket|Core\(s\)' || true
  echo "# memory"; free -h
  echo "# disk"; df -hT | grep -vE 'tmpfs|overlay'
  echo "# locale"; locale 2>/dev/null | head -5
  echo "# timezone"; timedatectl 2>/dev/null | head -10 || true
} > "$OUT/host.txt"

# ---------- 2. package inventory ----------
note "apt packages"
dpkg-query -W -f='${binary:Package} ${Version} ${Architecture}\n' | sort > "$OUT/apt-packages.txt"
note "apt sources"
{ ls -1 /etc/apt/sources.list.d/ 2>/dev/null; echo --- ; cat /etc/apt/sources.list 2>/dev/null; echo --- ; for f in /etc/apt/sources.list.d/*; do echo "# $f"; cat "$f"; done; } > "$OUT/apt-sources.txt" 2>/dev/null || true
note "apt keyrings"
ls -la /usr/share/keyrings/ /etc/apt/keyrings/ 2>/dev/null > "$OUT/apt-keyrings.txt" || true
note "apt holds"
apt-mark showhold > "$OUT/apt-holds.txt" 2>/dev/null || true

# ---------- 3. language runtimes ----------
note "language runtimes"
{
  echo "# node";   command -v node    && node --version    || true
  echo "# pnpm";   command -v pnpm    && pnpm --version    || true
  echo "# npm";    command -v npm     && npm --version     || true
  echo "# python"; command -v python3 && python3 --version || true
  echo "# java";   command -v java    && java -version 2>&1 || true
  echo "# go";     command -v go      && go version        || true
  echo "# psql";   command -v psql    && psql --version    || true
  echo "# pgbouncer"; command -v pgbouncer && pgbouncer --version 2>&1 | head -1 || true
  echo "# pgbackrest"; command -v pgbackrest && pgbackrest version || true
  echo "# nats-server"; command -v nats-server && nats-server -v || true
  echo "# temporal"; command -v temporal && temporal --version 2>&1 | head -1 || true
  echo "# openfga"; command -v openfga && openfga version 2>&1 | head -3 || true
  echo "# minio"; command -v minio && minio --version 2>&1 | head -1 || true
  echo "# valkey"; command -v valkey-server && valkey-server --version || command -v redis-server && redis-server --version || true
  echo "# clickhouse"; command -v clickhouse && clickhouse --version 2>&1 | head -1 || true
  echo "# litellm"; command -v litellm && litellm --version 2>&1 | head -1 || true
  echo "# ollama"; command -v ollama && ollama --version 2>&1 | head -1 || true
  echo "# caddy";  command -v caddy   && caddy version     || true
  echo "# otelcol"; command -v otelcol && otelcol --version || true
  echo "# prometheus"; command -v prometheus && prometheus --version 2>&1 | head -1 || true
  echo "# alertmanager"; command -v alertmanager && alertmanager --version 2>&1 | head -1 || true
  echo "# grafana-server"; command -v grafana-server && grafana-server -v 2>&1 | head -1 || true
  echo "# cloudflared"; command -v cloudflared && cloudflared --version || true
  echo "# sops"; command -v sops && sops --version 2>&1 | head -1 || true
  echo "# age";  command -v age  && age --version  || true
  echo "# syft"; command -v syft && syft version 2>&1 | head -3 || true
  echo "# grype"; command -v grype && grype version 2>&1 | head -3 || true
  echo "# cosign"; command -v cosign && cosign version 2>&1 | head -3 || true
  echo "# pm2";  command -v pm2  && pm2 --version  || true
} > "$OUT/runtimes.txt" 2>&1

# ---------- 4. systemd ----------
note "systemd units (managed by Dogan AI OS)"
DOGAN_UNITS=(
  postgresql@18-main.service postgresql.service
  pgbouncer.service
  keycloak.service openfga.service temporal.service litellm.service
  ollama.service nats.service valkey.service redis.service
  clickhouse-server.service minio.service caddy.service
  otelcol.service prometheus.service alertmanager.service grafana-server.service
  cloudflared.service cloudflared-update.timer
  dogan-secrets.service oathkeeper.service
  dogan-pgbackrest-backup.timer dogan-pgbackrest-restore-drill.timer
  pm2-root.service
)
for u in "${DOGAN_UNITS[@]}"; do
  state=$(systemctl is-enabled "$u" 2>/dev/null || echo "n/a")
  active=$(systemctl is-active "$u" 2>/dev/null || echo "n/a")
  printf '%-50s enabled=%-10s active=%s\n' "$u" "$state" "$active"
done > "$OUT/systemd-units.txt"
# Copy unit files + drop-ins for offline replay
for u in "${DOGAN_UNITS[@]}"; do
  src="/etc/systemd/system/$u"
  if [[ -f "$src" ]]; then cp -a "$src" "$OUT/systemd/"; fi
  dropdir="/etc/systemd/system/${u}.d"
  if [[ -d "$dropdir" ]]; then cp -a "$dropdir" "$OUT/dropins/"; fi
done

# ---------- 5. configs ----------
note "configs"
# Files we must NEVER snapshot (private keys, password files, plaintext secrets).
# Patterns are evaluated against the destination path under $OUT/configs/.
SENSITIVE_RE='(private\.key|userlist\.txt|admin\.password|\.password$|/secrets/|ldap\.toml|grafana\.ini|alert_notification|datasources?/.*\.ya?ml$|provisioning/notifiers|pgbackrest\.conf|cloudflared/.*\.json$|cert\.key|tls\.key|server\.key|client\.key|signing\.key|\.pem$|\.p12$|\.jks$|jwt\.secret|nats-server\.conf)'
copy_if() {
  for p in "$@"; do
    [[ -e "$p" ]] || continue
    cp -a --parents "$p" "$OUT/configs/" 2>/dev/null || true
  done
}
redact_configs() {
  # Remove sensitive files from the snapshot tree.
  find "$OUT/configs" -type f 2>/dev/null | while read -r f; do
    if [[ "$f" =~ $SENSITIVE_RE ]]; then
      shred -u "$f" 2>/dev/null || rm -f "$f"
    fi
  done
  # Strip secret-looking values from text files we keep.
  find "$OUT/configs" -type f \( -name '*.conf' -o -name '*.ini' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.xml' -o -name '*.json' \) 2>/dev/null | while read -r f; do
    sed -E -i \
      -e 's/(password[^=:]*[=:][[:space:]]*)[^[:space:]"]+/\1REDACTED/Ig' \
      -e 's/(secret[^=:]*[=:][[:space:]]*)[^[:space:]"]+/\1REDACTED/Ig' \
      -e 's/(token[^=:]*[=:][[:space:]]*)[^[:space:]"]+/\1REDACTED/Ig' \
      -e 's/(api[_-]?key[^=:]*[=:][[:space:]]*)[^[:space:]"]+/\1REDACTED/Ig' \
      -e 's#(://[^:/@[:space:]]+:)[^@/[:space:]]+@#\1REDACTED@#g' \
      "$f" 2>/dev/null || true
  done
}
copy_if /etc/postgresql/18/main/postgresql.conf
copy_if /etc/postgresql/18/main/conf.d
copy_if /etc/postgresql/18/main/pg_hba.conf
copy_if /etc/pgbouncer
copy_if /etc/keycloak
copy_if /etc/openfga
copy_if /etc/temporal
copy_if /etc/litellm
copy_if /etc/nats
copy_if /etc/valkey
copy_if /etc/redis
copy_if /etc/clickhouse-server
copy_if /etc/minio
copy_if /etc/caddy
copy_if /etc/otelcol
copy_if /etc/prometheus
copy_if /etc/alertmanager
copy_if /etc/grafana
copy_if /etc/oathkeeper
copy_if /etc/cloudflared
copy_if /etc/pgbackrest
copy_if /etc/nftables.conf
copy_if /etc/security/limits.d
copy_if /etc/sysctl.d

redact_configs

# Redact env files (keep only keys)
mkdir -p "$OUT/configs/env-keys"
for f in /etc/dogan-ai-os/*.env; do
  [[ -f "$f" ]] || continue
  awk -F= '/^[A-Z]/{print $1}' "$f" > "$OUT/configs/env-keys/$(basename "$f").keys"
done

# ---------- 6. PostgreSQL state ----------
note "postgres state"
PG_PSQL="sudo -u postgres psql -p 5432 -At"
{
  echo "# version"; $PG_PSQL -c "select version();"
  echo "# settings (non-default)"
  $PG_PSQL -c "select name, setting, source from pg_settings where source not in ('default','override') order by name;"
  echo "# databases"; $PG_PSQL -c "select datname, pg_size_pretty(pg_database_size(datname)) from pg_database order by 1;"
  echo "# roles"; $PG_PSQL -c "select rolname, rolsuper, rolbypassrls, rolcanlogin from pg_roles order by 1;"
  echo "# extensions per db"
  for db in $($PG_PSQL -c "select datname from pg_database where datistemplate=false and datname<>'postgres'"); do
    echo "## $db"
    sudo -u postgres psql -p 5432 -At -d "$db" -c "select extname || '@' || extversion from pg_extension order by 1;" 2>/dev/null || true
  done
  echo "# pgaudit + preload"; $PG_PSQL -c "show shared_preload_libraries;"
  echo "# pgbackrest stanzas"; sudo -u postgres pgbackrest info --output=json 2>/dev/null | head -c 4000 || true
} > "$OUT/postgres.txt" 2>&1

# ---------- 7. Cloudflare tunnel ----------
note "cloudflared tunnel"
{
  echo "# version"; cloudflared --version 2>&1 || true
  echo "# tunnels"; cloudflared tunnel list 2>&1 || true
  echo "# active service config (redacted)"
  if [[ -f /etc/cloudflared/config.yml ]]; then sed -E 's/(token|secret)[[:space:]]*:.*/\1: REDACTED/Ig' /etc/cloudflared/config.yml; fi
} > "$OUT/cloudflare.txt"

# ---------- 8. Repo + workspace ----------
note "repo state"
{
  echo "# git"; git -C "$REPO_DIR" rev-parse HEAD; git -C "$REPO_DIR" status --short
  echo "# pnpm-workspace"; cat "$REPO_DIR/pnpm-workspace.yaml" 2>/dev/null
  echo "# packageManager"; jq -r '.packageManager // "unset"' "$REPO_DIR/package.json" 2>/dev/null
} > "$OUT/repo.txt"
cp -a "$REPO_DIR/pnpm-lock.yaml" "$OUT/" 2>/dev/null || true
( cd "$REPO_DIR" && pnpm -r list --json --depth -1 > "$OUT/pnpm-workspace-list.json" 2>/dev/null ) || true

# ---------- 9. PM2 (sanitised; full env may contain secrets) ----------
note "pm2"
pm2 jlist 2>/dev/null \
  | jq 'map({name, pm_id, pm2_env: {status, exec_mode, instances, pm_exec_path, pm_cwd, restart_time}})' \
  > "$OUT/pm2.json" 2>/dev/null || echo '[]' > "$OUT/pm2.json"

# ---------- 10. summary manifest ----------
note "manifest"
{
  echo "{"
  echo "  \"snapshot\": \"$TS\","
  echo "  \"host\": \"$(hostname -f 2>/dev/null || hostname)\","
  echo "  \"kernel\": \"$(uname -r)\","
  echo "  \"os\": \"$(. /etc/os-release && echo "$PRETTY_NAME")\","
  echo "  \"git_sha\": \"$(git -C "$REPO_DIR" rev-parse HEAD)\","
  echo "  \"git_branch\": \"$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)\","
  echo "  \"node\": \"$(node --version 2>/dev/null || echo none)\","
  echo "  \"pnpm\": \"$(pnpm --version 2>/dev/null || echo none)\","
  echo "  \"postgres\": \"$(sudo -u postgres psql -p 5432 -At -c 'show server_version' 2>/dev/null || echo none)\","
  echo "  \"keycloak_active\": \"$(systemctl is-active keycloak 2>/dev/null)\","
  echo "  \"composer_active\": \"$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status // "n/a"')\","
  echo "  \"artifact_dir\": \"$OUT\""
  echo "}"
} > "$OUT/manifest.json"

# ---------- 11. mirror to latest/ for git ----------
note "mirroring to latest/"
rsync -a --delete --exclude='configs/etc/dogan-ai-os/*.env' "$OUT/" "$LATEST/" 2>/dev/null || cp -a "$OUT"/* "$LATEST/"

note "snapshot complete: $OUT"
echo "$OUT"
