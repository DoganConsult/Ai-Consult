#!/usr/bin/env bash
# Dogan AI OS - scheduled pgBackRest runner.
# Strategy: weekly full (Sun 02:00), daily differential (02:00 Mon-Sat),
# hourly incremental every other hour. Triggered by systemd OnCalendar=hourly.
set -euo pipefail

STANZA="${STANZA:-dogan_master}"
HOUR=$(date +%H)
DOW=$(date +%u)   # 1=Mon..7=Sun

if [[ "$HOUR" == "02" && "$DOW" == "7" ]]; then
  TYPE=full
elif [[ "$HOUR" == "02" ]]; then
  TYPE=diff
else
  TYPE=incr
fi

exec /usr/bin/pgbackrest --stanza="$STANZA" --type="$TYPE" backup
