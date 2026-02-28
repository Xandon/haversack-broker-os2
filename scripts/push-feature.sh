#!/bin/bash
set -e

BRANCH=$(git branch --show-current)

if [[ ! "$BRANCH" =~ ^feature/ ]]; then
  echo "ERROR: Not on a feature branch. Current branch: ${BRANCH}"
  exit 1
fi

echo "Running lint..."
npm run lint

echo "Running tests..."
npm test

echo "Pushing ${BRANCH} to origin..."
git push -u origin "${BRANCH}"
echo "Push complete."
