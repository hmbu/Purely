#!/bin/bash
# Linux / macOS terminal: ./start.sh   (add --port 8090 to change the port)
cd "$(dirname "$0")"
node server/server.js --open-chrome "$@"
