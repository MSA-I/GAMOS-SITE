@echo off
chcp 65001 >nul
title GAMOS - שרת האתר (http://localhost:8000)
cd /d "%~dp0"

echo ==========================================
echo    GAMOS - הפעלת האתר (דסקטופ)
echo ==========================================
echo.

rem אם השרת כבר רץ על פורט 8000 - רק פותחים דפדפן ולא מפעילים שרת שני
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo השרת כבר רץ. פותח את הדפדפן...
    start "" http://localhost:8000
    echo.
    echo לעצירה: הרץ "עצירת-האתר.bat".
    timeout /t 3 /nobreak >nul
    exit /b 0
)

echo מפעיל שרת על http://localhost:8000
echo (אם קוד האולמות השתנה - ייבנה אוטומטית קודם, זה לוקח כמה שניות)
echo.
echo לעצירה: סגור חלון זה, הקש Ctrl+C, או הרץ "עצירת-האתר.bat".
echo.

rem פותח את הדפדפן אוטומטית אחרי ~8 שניות (בחלון-עזר נפרד), והשרת רץ כאן בחזית
start "" cmd /c "timeout /t 8 /nobreak >nul & explorer http://localhost:8000"
call npm run dev
