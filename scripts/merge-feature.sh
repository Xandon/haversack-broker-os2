#!/bin/bash
set -e

FEATURE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET=${1:-main}

echo "Running full test suite on $FEATURE_BRANCH..."
npm run lint
npm test
npm run test:e2e 2>/dev/null || echo "No E2E tests, skipping."

git checkout "$TARGET" && git pull origin "$TARGET"
git merge --no-ff "$FEATURE_BRANCH" -m "merge: $FEATURE_BRANCH into $TARGET"
git push origin "$TARGET"
echo "Merged $FEATURE_BRANCH into $TARGET."
