# Wrapper opcional: usa el init 100% Docker (mismo que el README).
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
docker compose run --rm db-init
