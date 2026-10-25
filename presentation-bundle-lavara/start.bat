@echo off
REM Windows: double-click to start the show launcher.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required: https://nodejs.org & pause & exit /b 1)
node server\server.js --open-chrome %*
pause
