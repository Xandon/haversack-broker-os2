#!/bin/bash
set -e

FEATURE=$1
BRANCH_TYPE=${2:-feature}
BASE_BRANCH=${3:-main}

if [ -z "$FEATURE" ]; then
  echo "Usage: ./scripts/new-feature.sh <feature-name> [branch-type] [base-branch]"
  echo "Branch types: feature (default), fix, chore"
  exit 1
fi

# Validate branch type
case "$BRANCH_TYPE" in
  feature|fix|chore) ;;
  *) echo "Invalid branch type: $BRANCH_TYPE (use feature, fix, or chore)" && exit 1 ;;
esac

git checkout "$BASE_BRANCH" && git pull origin "$BASE_BRANCH"
git checkout -b "${BRANCH_TYPE}/${FEATURE}"

mkdir -p "docs/tasks"
echo "# ${FEATURE} — Tasks

- [ ] Implementation
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Documentation" > "docs/tasks/${FEATURE}.md"

git add . && git commit -m "scaffold: initialize ${BRANCH_TYPE}/${FEATURE}"
echo "Ready to build ${BRANCH_TYPE}/${FEATURE}"
