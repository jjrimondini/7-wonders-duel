@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installo le dipendenze...
  call npm install
)
start "" http://localhost:3000/board/
node server\index.js
pause
