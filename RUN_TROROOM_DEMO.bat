@echo off
title TroRoom - DEMO DATA

echo =====================================
echo    TRO ROOM - CHE DO DU LIEU MAU
echo =====================================
echo.

REM Nap bien moi truong tu file .env (khong duoc commit)
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
        if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
    )
)

REM Bat che do staging + seed du lieu mau (idempotent, chay lai duoc)
set SPRING_PROFILES_ACTIVE=staging
set DEMO_SEED_ENABLED=true
set DEMO_PASSWORD=Demo@12345

REM Dung database demo rieng, khong dong vao du lieu that (tro_room)
set SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/tro_room_demo

echo [1/2] Starting Backend (staging + demo seed)...
start "TroRoom Backend DEMO" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend...
start "TroRoom Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo =====================================
echo   TAI KHOAN DEMO (mat khau: Demo@12345)
echo =====================================
echo   ADMIN    : admin@demo.local
echo   LANDLORD : landlord@demo.local
echo   MANAGER  : manager@demo.local
echo   TENANT   : tenant01@demo.local .. tenant21@demo.local
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo.
echo   Luu y: du lieu mau nam trong database "tro_room_demo" (tao san bang lenh:
echo          psql -U postgres -c "CREATE DATABASE tro_room_demo;")
echo.
pause
