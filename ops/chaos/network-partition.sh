#!/usr/bin/env bash
# Dogan AI OS - simulate network partition to a single dependency port via nft.
# Usage: network-partition.sh <port> <duration_sec>
set -euo pipefail
PORT="${1:?port}"
DUR="${2:-30}"
TBL="dogan_chaos"
nft add table inet $TBL 2>/dev/null || true
nft add chain inet $TBL out '{ type filter hook output priority 0; policy accept; }' 2>/dev/null || true
nft add rule  inet $TBL out tcp dport $PORT drop
echo "partition on tcp/$PORT for ${DUR}s"
sleep "$DUR"
nft flush chain inet $TBL out
nft delete table inet $TBL
echo "partition cleared on tcp/$PORT"
