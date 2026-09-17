param(
    [switch]$Build,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageName = "finally:latest"
$ContainerName = "finally-app"
$Port = 8000

if (-not (Test-Path ".env")) {
    Write-Host "No .env found — copying .env.example. Add your OPENROUTER_API_KEY before using real LLM chat." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

New-Item -ItemType Directory -Force -Path "db" | Out-Null

$existing = docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}"
if ($existing -eq $ContainerName) {
    Write-Host "Removing existing container '$ContainerName'..."
    docker rm -f $ContainerName | Out-Null
}

$imageExists = docker images -q $ImageName
if ($Build -or -not $imageExists) {
    Write-Host "Building Docker image '$ImageName'..."
    docker build -t $ImageName .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }
}

Write-Host "Starting container '$ContainerName' on port $Port..."
docker run -d `
    --name $ContainerName `
    -p "${Port}:8000" `
    -v "finally-data:/app/db" `
    --env-file ".env" `
    $ImageName | Out-Null

if ($LASTEXITCODE -ne 0) { throw "Failed to start container" }

$Url = "http://localhost:$Port"
Write-Host ""
Write-Host "FinAlly is running at $Url" -ForegroundColor Green
Write-Host "Stop it with: scripts\stop_windows.ps1"

if (-not $NoBrowser) {
    Start-Process $Url
}
