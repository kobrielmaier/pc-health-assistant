@echo off
REM PC Health Assistant Launcher
REM This script launches the PC Health Assistant application

cd /d "%~dp0"
echo Starting PC Health Assistant...
echo This will start both the Vite dev server and Electron...
npm run dev
