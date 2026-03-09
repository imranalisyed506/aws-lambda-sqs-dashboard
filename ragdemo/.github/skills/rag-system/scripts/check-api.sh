#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-http://localhost:3000}"

curl -s "${API_BASE}/health" | cat
