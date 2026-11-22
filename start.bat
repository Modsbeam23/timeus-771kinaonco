@echo off
cd /d "%~dp0"
if not exist .env (
  echo Please copy .env.example to .env and add your Discord credentials.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Deploying slash commands...
call npm run deploy
echo Starting ModsL...
call npm start
