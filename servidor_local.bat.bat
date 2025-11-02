@echo off
chcp 65001 >nul
title Servidor Local Pokeparadas
cd /d "%~dp0"

echo ==========================================
echo 🚀 Iniciando servidor local Pokeparadas
echo ==========================================
echo Carpeta actual: %cd%
echo.

:: Comprobar si Node.js y npx existen
echo Verificando Node.js y npx...
where node
where npx
echo.

if %errorlevel% neq 0 (
    echo ⚠️ No se encontró Node.js o npx.
    echo Abriendo index.html directamente...
    start "" "%cd%\index.html"
    pause
    exit /b
)

echo ✅ Node.js detectado correctamente.
echo.
node -v
echo.

echo Iniciando Live Server (puerto 5500)...
echo ------------------------------------------
npx live-server --port=5500 --no-browser
echo ------------------------------------------

pause
