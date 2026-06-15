@echo off
chcp 65001 >nul
title GAMOS - שרת המובייל (http://localhost:8000/mobile/)
cd /d "%~dp0"

echo ==========================================
echo    GAMOS - הפעלת גרסת המובייל
echo ==========================================
echo.

echo [1/3] בונה את עמוד המובייל מתוך index.html ...
call npm run build:mobile
if errorlevel 1 (
    echo.
    echo שגיאה בבניית המובייל. בדוק את ההודעה למעלה.
    pause
    exit /b 1
)
echo.

rem המובייל מוגש מאותו שרת כמו הדסקטופ (פורט 8000).
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo [2/3] השרת כבר רץ על פורט 8000.
    echo [3/3] פותח את גרסת המובייל בדפדפן...
    start "" http://localhost:8000/mobile/
    echo.
    echo לעצירה: הרץ "עצירת-מובייל.bat".
    timeout /t 3 /nobreak >nul
    exit /b 0
)

echo [2/3] מפעיל שרת על http://localhost:8000
echo [3/3] גרסת המובייל: http://localhost:8000/mobile/
echo.
echo טיפ: בכרום פתח DevTools (F12) ולחץ Toggle device toolbar
echo      כדי לראות את המראה של iPhone / Galaxy.
echo.
echo לעצירה: סגור חלון זה, הקש Ctrl+C, או הרץ "עצירת-מובייל.bat".
echo.

start "" cmd /c "timeout /t 8 /nobreak >nul & explorer http://localhost:8000/mobile/"
call npm run dev
