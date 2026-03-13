$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$deployRoot = Join-Path $repoRoot '.deploy'
$stagingRoot = Join-Path $deployRoot 'hostinger'
$zipPath = Join-Path $deployRoot 'vmrs-hostinger.zip'

Write-Host 'Building frontend...'
Push-Location $repoRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Frontend build failed.'
    }
} finally {
    Pop-Location
}

if (Test-Path $stagingRoot) {
    Remove-Item $stagingRoot -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

$itemsToCopy = @(
    '.htaccess',
    'index.php',
    'app',
    'config',
    'database',
    'dist',
    'public'
)

foreach ($item in $itemsToCopy) {
    $sourcePath = Join-Path $repoRoot $item
    if (-not (Test-Path $sourcePath)) {
        throw "Required path not found: $item"
    }

    Copy-Item $sourcePath -Destination $stagingRoot -Recurse -Force
}

Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "Hostinger package created:"
Write-Host "  Staging folder: $stagingRoot"
Write-Host "  Zip file: $zipPath"
Write-Host ''
Write-Host 'Upload the ZIP contents to your Hostinger site root or extract them inside public_html.'
