#!/usr/bin/env bash
# Launch a local preview of Universal Webinar (Vite + React 18 + Supabase realtime).
# Runs the dev server in the foreground — press Ctrl-C to stop.
#
# Usage:  ./scripts/preview.sh [port]      (default 5179, the configured port)
#
# Needs its own Supabase env to exercise realtime — see SUPABASE.md. First run
# installs deps if node_modules is missing.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PORT="${1:-5179}"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (first run)…"
  npm install
fi

echo "Universal Webinar → http://localhost:$PORT"
exec npm run dev -- --port "$PORT" --strictPort
