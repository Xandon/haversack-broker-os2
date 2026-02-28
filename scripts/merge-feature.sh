#!/bin/bash
set -e

BRANCH=$(git branch --show-current)
TARGET="${1:-develop}"

if [[ ! "$BRANCH" =~ ^feature/ ]]; then
  echo "ERROR: Not on a feature branch. Current branch: ${BRANCH}"
  exit 1
fi

echo "Running tests before merge..."
npm test

echo "Merging ${BRANCH} into ${TARGET}..."
git checkout "${TARGET}"
git pull
git merge --no-ff "${BRANCH}"
echo "Merge complete. Remember to push ${TARGET} and delete the feature branch."
