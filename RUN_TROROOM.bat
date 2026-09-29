@echo off
title TroRoom

echo ==============================
echo       TRO ROOM STARTING
echo ==============================

echo.
echo [1/2] Starting Backend...
start "TroRoom Backend" cmd /k "cd /d D:\TroRoomProject\backend && mvnw.cmd spring-boot:run"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "TroRoom Frontend" cmd /k "cd /d D:\TroRoomProject\frontend && npm.cmd run dev"

echo.
echo TroRoom is starting...
echo Frontend: http://localhost:5173
echo Backend : http://localhost:8080
echo.
pause