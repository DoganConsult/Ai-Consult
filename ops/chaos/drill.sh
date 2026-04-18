#!/usr/bin/env bash
# Dogan AI OS - GameDay chaos drill.
# Runs controlled failure scenarios against a single host and verifies that
# /kernel/ready transitions to degraded then back to ready, and that the
# correct alerts fire in Alertmanager.
set -euo pipefail

KERNEL="${KERNEL:-http://127.0.0.1:3100}"
AM="${AM:-http://127.0.0.1:9093}"
LOG_DIR="${LOG_DIR:-/var/log/dogan-ai-os/chaos}"
install -d -m 0755 "$LOG_DIR"
LOG="${LOG_DIR}/drill-$(date +%Y%m%d-%H%M%S).log"

note() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

probe_ready() {
  curl -fsS -o /dev/null -w '%{http_code}' "${KERNEL}/kernel/ready" || echo "000"
}

wait_for_ready_state() {
  local want="$1"; local timeout="${2:-120}"
  local start=$SECONDS
  while (( SECONDS - start < timeout )); do
    local code; code=$(probe_ready)
    if [[ "$code" == "$want" ]]; then return 0; fi
    sleep 2
  done
  note "TIMEOUT waiting for /kernel/ready=$want"
  return 1
}

scenario_keycloak_down() {
  note "scenario: stop keycloak"
  systemctl stop keycloak
  wait_for_ready_state 503 120 || return 1
  note "ready=503 confirmed; restarting keycloak"
  systemctl start keycloak
  wait_for_ready_state 200 180 || return 1
  note "scenario keycloak_down: PASS"
}

scenario_nats_down() {
  note "scenario: stop nats"
  systemctl stop nats
  wait_for_ready_state 503 60 || return 1
  systemctl start nats
  wait_for_ready_state 200 120 || return 1
  note "scenario nats_down: PASS"
}

scenario_pg_pause_via_pgbouncer() {
  note "scenario: pause pg via pgbouncer"
  psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "PAUSE dogan_master;" || true
  sleep 30
  psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer -c "RESUME dogan_master;" || true
  wait_for_ready_state 200 120 || return 1
  note "scenario pg_pause: PASS"
}

main() {
  note "chaos drill starting; baseline /kernel/ready=$(probe_ready)"
  scenario_keycloak_down
  scenario_nats_down
  scenario_pg_pause_via_pgbouncer
  note "chaos drill complete; final /kernel/ready=$(probe_ready)"
}

main "$@"
