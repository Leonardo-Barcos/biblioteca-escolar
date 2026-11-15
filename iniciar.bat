@echo off
chcp 65001 >nul
title Biblioteca Escolar
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Node.js nao esta instalado neste computador.
  echo  Baixe a versao LTS em https://nodejs.org e instale. Depois abra este arquivo de novo.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo  Preparando o sistema pela primeira vez, aguarde...
  call npm install --omit=dev
)

start "" http://localhost:3000
call npm start
pause
