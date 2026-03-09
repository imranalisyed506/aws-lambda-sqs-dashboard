$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$models = @(
  "nomic-embed-text",
  "llama3.1:8b",
  "qwen2.5:7b",
  "mistral:7b-instruct"
)

Start-Process -FilePath "docker" -ArgumentList "compose up -d ollama" -WorkingDirectory $root | Out-Null

foreach ($model in $models) {
  Write-Host "Pulling $model..."
  & docker compose exec ollama ollama pull $model
}

Write-Host "All models pulled."
