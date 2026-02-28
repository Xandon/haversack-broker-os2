#!/bin/bash
set -e
echo "Starting visual verification..."
echo "Dev server should be running. Checking..."

PORT="${PORT:-3000}"

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" | grep -q "200"; then
  echo "  Dev server responding at localhost:${PORT}"
else
  echo "  ERROR: Dev server not responding at localhost:${PORT}. Start it first."
  exit 1
fi

echo "Visual verification: manually inspect the page or use Claude Preview tools."
echo "  - preview_start to launch server"
echo "  - preview_screenshot to capture current state"
echo "  - preview_snapshot to get accessibility tree"
echo "  - preview_inspect to check specific elements"
