#!/usr/bin/env bash
set -euo pipefail

base_ref="${1:-main}"
node scripts/quality-gate.mjs --base-ref="$base_ref"
