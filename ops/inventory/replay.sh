#!/usr/bin/env bash
# Dogan AI OS - replay snapshot on a fresh host.
# Reads ops/inventory/latest/ and reproduces:
#   1. apt repos + GPG keys
#   2. apt packages at recorded versions
#   3. systemd unit files + drop-ins
#   4. config trees under /etc
#   5. workspace install (pnpm) + composer build
# Secrets are NOT replayed; the operator runs `dogan-secrets.service` with the
# host's age key after this script finishes.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/root/Ai-Consult-Microservices}"
SRC="${SRC:-${REPO_DIR}/ops/inventory/latest}"

[[ -d "$SRC" ]] || { echo "missing snapshot dir: $SRC" >&2; exit 1; }
[[ "$(id -u)" -eq 0 ]] || { echo "must run as root" >&2; exit 1; }

note() { printf '[%s] %s\n' "$(date -Is)" "$*"; }

note "replay from $SRC"

# ---------- 1. apt sources + keys ----------
note "restore apt sources + keyrings"
mkdir -p /etc/apt/sources.list.d /usr/share/keyrings
if [[ -d "$SRC/configs/etc/apt/sources.list.d" ]]; then
  cp -a "$SRC/configs/etc/apt/sources.list.d/." /etc/apt/sources.list.d/
fi
if [[ -f "$SRC/configs/etc/apt/sources.list" ]]; then
  cp -a "$SRC/configs/etc/apt/sources.list" /etc/apt/sources.list
fi
apt-get update -y >/dev/null

# ---------- 2. apt packages at exact versions ----------
note "install apt packages at recorded versions"
PKG_FILE="$SRC/apt-packages.txt"
[[ -f "$PKG_FILE" ]] || { echo "missing $PKG_FILE" >&2; exit 1; }
# Build Package=Version list, skip arch-only :i386, skip kernel meta.
mapfile -t PKGS < <(awk '
  $1 !~ /^linux-(image|headers|modules)/ { print $1 "=" $2 }
' "$PKG_FILE")
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  --allow-downgrades --allow-change-held-packages "${PKGS[@]}"

# ---------- 3. systemd units + drop-ins ----------
note "restore systemd units + drop-ins"
if [[ -d "$SRC/systemd" ]]; then cp -a "$SRC/systemd/." /etc/systemd/system/; fi
if [[ -d "$SRC/dropins" ]]; then cp -a "$SRC/dropins/." /etc/systemd/system/; fi
systemctl daemon-reload

# ---------- 4. configs ----------
note "restore /etc configs"
if [[ -d "$SRC/configs/etc" ]]; then cp -a "$SRC/configs/etc/." /etc/; fi

# ---------- 5. PostgreSQL extensions ----------
note "rebuild PostgreSQL extensions per db (idempotent)"
PG_LINES="$SRC/postgres.txt"
if [[ -f "$PG_LINES" ]]; then
  awk '/^## /{db=$2} /@/{ if (db) print db, $0 }' "$PG_LINES" \
    | while read -r db extspec; do
        ext="${extspec%%@*}"
        sudo -u postgres psql -p 5432 -d "$db" -c "create extension if not exists \"$ext\" cascade;" >/dev/null 2>&1 || true
      done
fi

# ---------- 6. workspace ----------
note "install pnpm workspace + build"
cd "$REPO_DIR"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile
pnpm -r run build

# ---------- 7. final reminder ----------
cat <<EOF

[NEXT]  Replay copied unit files, drop-ins, configs, and packages.
        It did NOT copy secrets. To finish:

  1. Place the host age private key at /etc/dogan-ai-os/age/key.txt (chmod 0600).
  2. systemctl enable --now dogan-secrets.service
  3. systemctl restart keycloak openfga temporal litellm nats valkey ...
  4. pm2 resurrect    # if /root/.pm2/dump.pm2 was restored
  5. curl -fsS http://127.0.0.1:3100/kernel/ready   # expect 200, 7/7 UP

EOF
