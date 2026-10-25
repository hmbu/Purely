#!/bin/bash
# macOS: double-click to start the show launcher (opens Chrome: control panel + full-screen presentation).
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required: https://nodejs.org (LTS). Install it, then double-click again."; read -n 1; exit 1
fi
node server/server.js --open-chrome "$@"
