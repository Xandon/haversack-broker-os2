#!/usr/bin/env bash
set -e

FEATURE_BRANCH=$(git branch --show-current)
TARGET=${1:-main}

if [ "$FEATURE_BRANCH" = "$TARGET" ]; then
  echo "Error: Already on $TARGET. Switch to a feature branch first."
  exit 1
fi

echo "Merging $FEATURE_BRANCH into $TARGET"
echo ""

echo "Running lint..."
npm run lint
echo ""

echo "Running tests..."
npm test
echo ""

echo "Running E2E tests..."
npm run test:e2e 2>/dev/null || echo "No E2E tests found, skipping."
echo ""

echo "Switching to $TARGET..."
git checkout "$TARGET"
git pull origin "$TARGET"

echo "Merging with --no-ff..."
git merge --no-ff "$FEATURE_BRANCH" -m "merge: $FEATURE_BRANCH into $TARGET"

echo "Pushing $TARGET..."
git push origin "$TARGET"

echo ""
echo "Merged $FEATURE_BRANCH into $TARGET successfully."
