#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-http://localhost:3000}"
QUESTION="${2:-How do I configure authentication?}"

curl -s -X POST "${API_BASE}/query" \
  -H "content-type: application/json" \
  -d "{\"question\": \"${QUESTION}\", \"topK\": 5}"
