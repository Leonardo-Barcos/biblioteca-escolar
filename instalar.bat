@echo off
chcp 65001 >nul
title Biblioteca Escolar - instalação
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\instalar.ps1"
