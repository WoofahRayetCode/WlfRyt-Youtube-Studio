# WlfRyt YouTube Studio Build Script (PowerShell)
# Usage: .\build.ps1 [win|mac|linux|all]

param(
    [Parameter(Position=0)]
    [ValidateSet('win', 'mac', 'linux', 'all')]
    [string]$Platform = 'win'
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Color($Message, $Color = "White") {
    Write-Host $Message -ForegroundColor $Color
}

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Read package.json for version
$PackageJson = Get-Content "$RootDir\package.json" | ConvertFrom-Json
$Version = $PackageJson.version

Write-Color "`n========================================" "Green"
Write-Color "  WlfRyt YouTube Studio Build Script" "Green"
Write-Color "  Version: $Version" "Green"
Write-Color "========================================`n" "Green"

# Change to root directory
Set-Location $RootDir

# Clean dist folder
Write-Color "Cleaning dist folder..." "Yellow"
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Color "Installing dependencies..." "Yellow"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Color "Failed to install dependencies!" "Red"
        exit 1
    }
}

# Build based on platform
Write-Color "`nBuilding for platform: $Platform" "Yellow"

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

switch ($Platform) {
    'win' {
        Write-Color "`nBuilding Windows app..." "Yellow"
        npx electron-builder --win dir
    }
    'mac' {
        Write-Color "`nBuilding macOS app..." "Yellow"
        npx electron-builder --mac
    }
    'linux' {
        Write-Color "`nBuilding Linux app..." "Yellow"
        npx electron-builder --linux
    }
    'all' {
        Write-Color "`nBuilding for all platforms..." "Yellow"
        npx electron-builder --win dir --mac --linux
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Color "`nBuild failed!" "Red"
    exit 1
}

# Create 7zip archive for Windows build
if ($Platform -eq 'win' -or $Platform -eq 'all') {
    Write-Color "`nCreating 7zip archive..." "Yellow"
    
    $ArchiveName = "WlfRyt-YouTube-Studio-$Version-win-x64.7z"
    $ArchivePath = Join-Path $RootDir "dist\$ArchiveName"
    $SourcePath = Join-Path $RootDir "dist\win-unpacked\*"
    
    # Find 7-Zip
    $SevenZipPaths = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe",
        "$env:ProgramFiles\7-Zip\7z.exe"
    )
    
    $SevenZip = $null
    foreach ($path in $SevenZipPaths) {
        if (Test-Path $path) {
            $SevenZip = $path
            break
        }
    }
    
    # Check if 7z is in PATH
    if (-not $SevenZip) {
        $SevenZip = Get-Command 7z -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    }
    
    if ($SevenZip) {
        Write-Color "  Using 7-Zip: $SevenZip" "Cyan"
        
        # Remove existing archive if present
        if (Test-Path $ArchivePath) {
            Remove-Item $ArchivePath -Force
        }
        
        # Create archive with maximum compression using all CPU cores
        & $SevenZip a -t7z -mx=9 -mfb=273 -ms -md=31 -mmt=on $ArchivePath $SourcePath
        
        if ($LASTEXITCODE -eq 0) {
            $ArchiveSize = [math]::Round((Get-Item $ArchivePath).Length / 1MB, 2)
            Write-Color "  Archive created: $ArchiveName ($ArchiveSize MB)" "Green"
        } else {
            Write-Color "  Failed to create archive!" "Red"
        }
    } else {
        Write-Color "  WARNING: 7-Zip not found. Skipping archive creation." "Yellow"
        Write-Color "  Install 7-Zip from https://www.7-zip.org/" "Yellow"
    }
}

Write-Color "`n========================================" "Green"
Write-Color "  Build Complete!" "Green"
Write-Color "  Output: $RootDir\dist" "Green"
Write-Color "========================================`n" "Green"

# List built files
if (Test-Path "dist") {
    Write-Color "Built files:" "Yellow"
    Get-ChildItem "dist" -File | ForEach-Object {
        $SizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Color "  - $($_.Name) ($SizeMB MB)" "White"
    }
    
    # Also list the win-unpacked exe
    if (Test-Path "dist\win-unpacked\WlfRyt YouTube Studio.exe") {
        Write-Color "`nExecutable:" "Yellow"
        Write-Color "  - dist\win-unpacked\WlfRyt YouTube Studio.exe" "White"
    }
}
