#!/usr/bin/env bash
set -euo pipefail
source /root/.cargo/env
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"
cd /mnt/c/Users/Administrator/instead/solana
exec "$@"
