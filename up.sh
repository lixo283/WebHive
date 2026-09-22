#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-demo}" in
  demo|live) WEBHIVE_MODE="${1:-demo}" ;;
  --help|-h) echo './up.sh [demo|live] — demo: без БД; live: backend/.env и подготовленная PostgreSQL'; exit 0 ;;
  *) echo 'Unknown mode. Use ./up.sh --help' >&2; exit 1 ;;
esac
command -v node >/dev/null
command -v npm >/dev/null
cd "$ROOT_DIR/backend"
if [ ! -d node_modules ]; then npm ci; fi
export WEBHIVE_MODE
exec node server.js
