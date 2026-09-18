#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-main}"
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git rev-parse --verify "${base_ref}^{commit}" >/dev/null

echo "== Branch and commits =="
git status --short --branch
git log --oneline --decorate "${base_ref}..HEAD"

echo "== Changed paths =="
git diff --name-status "${base_ref}...HEAD"

echo "== Diff hygiene =="
git diff --check "${base_ref}...HEAD"

for forbidden in node_modules dist 暗潮.html .DS_Store; do
  if git diff --name-only "${base_ref}...HEAD" | grep -Eq "(^|/)${forbidden}(/|$)"; then
    echo "forbidden generated/local path changed: $forbidden" >&2
    exit 1
  fi
done

echo "== Automated verification =="
npm test
npm run build
npm run build:offline
npm run test:offline

echo "QUALITY GATE PASSED"
