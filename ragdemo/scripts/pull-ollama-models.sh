#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODELS=(
  "nomic-embed-text"
  "llama3.1:8b"
  "qwen2.5:7b"
  "mistral:7b-instruct"
)

(cd "$ROOT_DIR" && docker compose up -d ollama)

for model in "${MODELS[@]}"; do
  echo "Pulling $model..."
  (cd "$ROOT_DIR" && docker compose exec ollama ollama pull "$model")
done

echo "All models pulled."
