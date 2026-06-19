@echo off
title Roshan Portfolio
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\serve-portfolio.ps1"
if errorlevel 1 pause
