#!/usr/bin/env bash
set -e

FEATURE_NAME=$1
BASE_BRANCH=${2:-main}

if [ -z "$FEATURE_NAME" ]; then
  echo "Usage: bash scripts/new-feature.sh <feature-name> [base-branch]"
  echo "  Creates a new feature branch from the base branch."
  echo "  Default base branch: main"
  echo ""
  echo "  Branch prefixes: feature/, fix/, chore/"
  echo "  Example: bash scripts/new-feature.sh account-crud"
  exit 1
fi

echo "Switching to $BASE_BRANCH and pulling latest..."
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

echo "Creating feature/$FEATURE_NAME..."
git checkout -b "feature/$FEATURE_NAME"

echo ""
echo "Ready to build feature/$FEATURE_NAME"
echo "  - Implement your feature"
echo "  - Write tests"
echo "  - Run: bash scripts/push-feature.sh"
