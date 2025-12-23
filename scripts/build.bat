@echo off
setlocal enabledelayedexpansion
echo ========================================
echo   WlfRyt YouTube Studio Build Script
echo ========================================
echo.

cd /d "%~dp0.."

:: Generate timestamp-based version (YYYY.MM.DD.HHMM)
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (
    set DATESTAMP=%%d.%%b.%%c
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set TIMESTAMP=%%a%%b
)
:: Remove any spaces and format properly
set TIMESTAMP=%TIMESTAMP: =0%
set VERSION=%date:~10,4%.%date:~4,2%.%date:~7,2%.%time:~0,2%%time:~3,2%
set VERSION=%VERSION: =0%

echo Version: %VERSION% (timestamp)
echo.

:: Update package.json with new version using PowerShell
echo Updating package.json version...
powershell -Command "(Get-Content package.json -Raw) -replace '\"version\": \"[^\"]*\"', '\"version\": \"%VERSION%\"' | Set-Content package.json -Encoding UTF8"

echo Installing dependencies...
call npm install

echo.
echo Building for Windows (portable)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win dir

echo.
echo Creating 7zip archive...
set ARCHIVE_NAME=WlfRyt-YouTube-Studio-%VERSION%-win-x64.7z

:: Try to find 7-Zip in common locations
set SEVENZIP=
if exist "C:\Program Files\7-Zip\7z.exe" set SEVENZIP="C:\Program Files\7-Zip\7z.exe"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set SEVENZIP="C:\Program Files (x86)\7-Zip\7z.exe"
if exist "%ProgramFiles%\7-Zip\7z.exe" set SEVENZIP="%ProgramFiles%\7-Zip\7z.exe"

:: Also check if 7z is in PATH
where 7z >nul 2>&1
if %errorlevel%==0 set SEVENZIP=7z

if defined SEVENZIP (
    echo Using 7-Zip: %SEVENZIP%
    if exist "dist\%ARCHIVE_NAME%" del "dist\%ARCHIVE_NAME%"
    %SEVENZIP% a -t7z -mx=9 -mfb=273 -ms -md=31 -mmt=on "dist\%ARCHIVE_NAME%" ".\dist\win-unpacked\*"
    echo.
    echo 7zip archive created: dist\%ARCHIVE_NAME%
) else (
    echo WARNING: 7-Zip not found. Skipping 7z archive creation.
    echo Install 7-Zip from https://www.7-zip.org/ to enable compression.
)

echo.
echo ========================================
echo   Build Complete!
echo   Output: dist\win-unpacked\WlfRyt YouTube Studio.exe
if defined SEVENZIP echo   Archive: dist\%ARCHIVE_NAME%
echo ========================================
echo.

pause
