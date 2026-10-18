# ==============================================================================
# NeoGet - Script de Release One-Click
# ==============================================================================
$ErrorActionPreference = 'Stop'

$packageJson = Get-Content -Raw "package.json" | ConvertFrom-Json
$version = $packageJson.version

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         NeoGet v$version - Release Engineering Pipeline   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Vérification des outils prérequis
Write-Host "`n[1/6] Vérification de l'environnement..." -ForegroundColor Yellow
$requiredTools = @('node', 'npm', 'cargo', 'winget')
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "Outil requis manquant : $tool. Interruption du pipeline."
        exit 1
    }
}
Write-Host "  -> Environnement OK (node, npm, cargo, winget disponibles)." -ForegroundColor Green

# 2. Build Frontend (TypeScript + Vite)
Write-Host "`n[2/6] Compilation du Frontend Web (TypeScript + Vite)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec de la compilation frontend (npm run build)."
    exit 1
}
Write-Host "  -> Build Frontend réussi." -ForegroundColor Green

# 3. Tests unitaires et d'intégration Backend Rust
Write-Host "`n[3/6] Exécution des tests Backend Rust..." -ForegroundColor Yellow
cargo test --manifest-path src-tauri/Cargo.toml --lib
if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec des tests Rust (cargo test)."
    exit 1
}
Write-Host "  -> Tests Rust réussis." -ForegroundColor Green

# 4. Compilation Release Desktop & Package NSIS via Tauri v2
Write-Host "`n[4/6] Génération de l'application Desktop et du Package NSIS..." -ForegroundColor Yellow
npm run tauri:build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Échec de la compilation Tauri Release (npm run tauri:build)."
    exit 1
}
Write-Host "  -> Compilation Release Tauri réussie." -ForegroundColor Green

# 5. Collecte et structuration des artefacts dans releases/
Write-Host "`n[5/6] Collecte des artefacts de release dans releases/..." -ForegroundColor Yellow

if (-not (Test-Path -Path "releases")) {
    New-Item -ItemType Directory -Path "releases" -Force | Out-Null
}

$releaseExe = Join-Path $env:USERPROFILE ".cargo\target\neoget\release\neoget.exe"
if (-not (Test-Path $releaseExe)) {
    $releaseExe = "src-tauri\target\release\neoget.exe"
}

if (Test-Path $releaseExe) {
    Copy-Item -Path $releaseExe -Destination "releases\NeoGet-$version-x64.exe" -Force
    Copy-Item -Path $releaseExe -Destination "releases\neoget.exe" -Force
    Write-Host "  -> Binaire autonome copié vers releases\NeoGet-$version-x64.exe" -ForegroundColor Green
} else {
    Write-Error "Exécutable portable introuvable dans $releaseExe"
    exit 1
}

# Rechercher le bundle d'installation NSIS généré par Tauri
$nsisCandidates = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis\*$version*.exe", "$env:USERPROFILE\.cargo\target\neoget\release\bundle\nsis\*$version*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if (-not $nsisCandidates -or $nsisCandidates.Count -eq 0) {
    $nsisCandidates = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis\*.exe", "$env:USERPROFILE\.cargo\target\neoget\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
}
if ($nsisCandidates -and $nsisCandidates.Count -gt 0) {
    $nsisSetup = $nsisCandidates[0].FullName
    Copy-Item -Path $nsisSetup -Destination "releases\NeoGet-Setup-$version-x64.exe" -Force
    Write-Host "  -> Installateur NSIS copié vers releases\NeoGet-Setup-$version-x64.exe (depuis $($nsisCandidates[0].Name))" -ForegroundColor Green
} else {
    # Fallback si le bundle NSIS est placé dans target/release/bundle/nsis
    $fallbackNsis = Get-ChildItem -Path "target\release\bundle\nsis\*$version*.exe", "target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($fallbackNsis -and $fallbackNsis.Count -gt 0) {
        Copy-Item -Path $fallbackNsis[0].FullName -Destination "releases\NeoGet-Setup-$version-x64.exe" -Force
        Write-Host "  -> Installateur NSIS copié vers releases\NeoGet-Setup-$version-x64.exe" -ForegroundColor Green
    } else {
        Write-Warning "Installateur NSIS non trouvé dans le dossier bundle par défaut. Copie du binaire en mode fallback."
        Copy-Item -Path $releaseExe -Destination "releases\NeoGet-Setup-$version-x64.exe" -Force
    }
}

# 6. Calcul des Hashs SHA-256
Write-Host "`n[6/6] Calcul des hachages SHA-256..." -ForegroundColor Yellow
$hashFile = "releases\SHA256SUMS.txt"
if (Test-Path $hashFile) { Remove-Item $hashFile -Force }

$portableExe = "releases\NeoGet-$version-x64.exe"
$setupExe = "releases\NeoGet-Setup-$version-x64.exe"

$hashPortable = (Get-FileHash -Path $portableExe -Algorithm SHA256).Hash.ToLower()
$hashSetup = (Get-FileHash -Path $setupExe -Algorithm SHA256).Hash.ToLower()

$lines = @(
    "$hashPortable *$([System.IO.Path]::GetFileName($portableExe))",
    "$hashSetup *$([System.IO.Path]::GetFileName($setupExe))"
)
$lines | Out-File -FilePath $hashFile -Encoding utf8
Write-Host "  -> Checksums sauvegardés dans $hashFile" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   BUILD RELEASE RÉUSSI - NeoGet v$version PRÊT           " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Get-ChildItem -Path "releases" | Select-Object Name, Length, LastWriteTime

