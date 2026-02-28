#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/new-feature.sh <feature-name>"
  echo "Example: ./scripts/new-feature.sh account-crud"
  exit 1
fi

FEATURE_NAME="$1"
BRANCH_NAME="feature/${FEATURE_NAME}"

echo "Creating feature branch: ${BRANCH_NAME}"
git checkout develop 2>/dev/null || git checkout main
git pull
git checkout -b "${BRANCH_NAME}"
echo "Branch '${BRANCH_NAME}' created. Ready for development."
