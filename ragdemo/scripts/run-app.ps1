$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$backend = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $root -PassThru
$frontend = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory (Join-Path $root "ui") -PassThru

$handler = {
  if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
  }
  if ($frontend -and -not $frontend.HasExited) {
    Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
  }
}

$null = Register-EngineEvent -SourceIdentifier ConsoleCancelEvent -Action $handler

try {
  Wait-Process -Id @($backend.Id, $frontend.Id)
} finally {
  & $handler
}
