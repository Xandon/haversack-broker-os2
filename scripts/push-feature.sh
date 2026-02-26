#!/usr/bin/env bash
set -e

BRANCH=$(git branch --show-current)

echo "Pushing branch: $BRANCH"
echo ""

echo "Running lint..."
npm run lint
echo ""

echo "Running tests..."
npm test
echo ""

echo "All checks passed. Pushing..."
git push origin "$BRANCH"

echo ""
echo "Branch $BRANCH pushed successfully."
echo "Create a PR at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/compare/$BRANCH"
