$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process -FilePath "docker" -ArgumentList "compose up -d" -WorkingDirectory $root | Out-Null

Write-Host "Docker services started."
