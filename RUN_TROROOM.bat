@echo off
title TroRoom

echo ==============================
echo       TRO ROOM STARTING
echo ==============================

echo.

REM Nap bien moi truong tu file .env (khong duoc commit)
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
        if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
    )
)

echo [1/2] Starting Backend...
start "TroRoom Backend" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "TroRoom Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo TroRoom is starting...
echo Frontend: http://localhost:5173
echo Backend : http://localhost:8080
echo.
pause