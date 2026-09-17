$ErrorActionPreference = "Stop"
$ContainerName = "finally-app"

$existing = docker ps -a --filter "name=^/${ContainerName}$" --format "{{.Names}}"
if ($existing -eq $ContainerName) {
    Write-Host "Stopping and removing container '$ContainerName'..."
    docker rm -f $ContainerName | Out-Null
    Write-Host "Stopped. Data volume 'finally-data' was preserved." -ForegroundColor Green
} else {
    Write-Host "Container '$ContainerName' is not running."
}
