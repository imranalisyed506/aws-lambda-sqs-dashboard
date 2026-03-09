#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ "${USE_DOCKER:-1}" == "1" ]]; then
  (cd "$ROOT_DIR" && docker compose up -d)
fi

(cd "$ROOT_DIR" && npm start) &
BACKEND_PID=$!

(cd "$ROOT_DIR/ui" && npm start) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
