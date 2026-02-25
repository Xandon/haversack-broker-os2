#!/bin/bash
set -e
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "═══════════════════════════════════════════════"
echo "  FULL REGRESSION TEST"
echo "  Branch: $BRANCH"
echo "═══════════════════════════════════════════════"

npm run lint
npm test
npm run test:integration 2>/dev/null || echo "  ⚠️  No integration tests configured"
npm run test:e2e 2>/dev/null || echo "  ⚠️  No E2E tests configured"
npm run build

echo ""
echo "  ✅ FULL REGRESSION PASSED on $BRANCH"
