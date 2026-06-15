@echo off
chcp 65001 >nul
title GAMOS - עצירת שרת האתר
cd /d "%~dp0"

echo ==========================================
echo    GAMOS - עצירת שרת האתר (פורט 8000)
echo ==========================================
echo.

set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo עוצר תהליך עם PID %%P ...
    taskkill /F /PID %%P >nul 2>&1
    set "FOUND=1"
)

if defined FOUND (
    echo.
    echo השרת בפורט 8000 נעצר.
) else (
    echo לא נמצא שרת פעיל על פורט 8000.
)

echo.
timeout /t 3 /nobreak >nul
