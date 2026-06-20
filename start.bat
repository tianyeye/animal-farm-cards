@echo off
cd /d "%~dp0"
set "PORT=8000"
set "PYCMD="
where python  >nul 2>nul && set "PYCMD=python"
if not defined PYCMD ( where py      >nul 2>nul && set "PYCMD=py" )
if not defined PYCMD ( where python3 >nul 2>nul && set "PYCMD=python3" )
if not defined PYCMD (
  echo [!] Python not found. Please install Python first, or run a static server manually.
  pause
  exit /b 1
)
echo ==================================================
echo   Animal Farm card site - local server
echo   URL : http://localhost:%PORT%/
echo   Stop: close this window
echo ==================================================
echo.
start "" "http://localhost:%PORT%/"
%PYCMD% -m http.server %PORT%
