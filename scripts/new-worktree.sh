#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <actor> <TASK-ID> <slug> [base-ref]" >&2
  echo "Example: $0 workbuddy WB-0001 act2-shell main" >&2
  exit 2
}

[[ $# -ge 3 && $# -le 4 ]] || usage

actor="$1"
task_id="$2"
slug="$3"
base_ref="${4:-main}"

[[ "$actor" =~ ^[a-z][a-z0-9-]*$ ]] || { echo "actor must use lowercase letters, digits, and hyphens" >&2; exit 2; }
[[ "$task_id" =~ ^[A-Z][A-Z0-9]*-[0-9]{4}$ ]] || { echo "TASK-ID must look like WB-0001" >&2; exit 2; }
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug must use lowercase letters, digits, and single hyphens" >&2; exit 2; }

repo_root="$(git rev-parse --show-toplevel)"
git -C "$repo_root" rev-parse --verify "${base_ref}^{commit}" >/dev/null

branch="${actor}/${task_id}-${slug}"
worktree_root="${ANCHAO_WORKTREE_ROOT:-$(dirname "$repo_root")/暗潮-worktrees}"
worktree_path="${worktree_root}/${task_id}-${slug}-${actor}"

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$branch"; then
  echo "branch already exists: $branch" >&2
  exit 1
fi

if [[ -e "$worktree_path" ]]; then
  echo "worktree path already exists: $worktree_path" >&2
  exit 1
fi

mkdir -p "$worktree_root"
git -C "$repo_root" worktree add -b "$branch" "$worktree_path" "$base_ref"

echo "Created branch:   $branch"
echo "Created worktree: $worktree_path"
echo "Open this directory in the assigned software and read AGENTS.md plus the task work order."
