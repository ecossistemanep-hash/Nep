@echo off
title NEP Delivery Control
color 0A

echo ========================================
echo   NEP Delivery Control - Sistema
echo ========================================
echo.

cd /d "%~dp0"

echo Iniciando servidor na porta 8000...
echo.
echo Acesse: http://localhost:8000/login.html
echo.
echo Pressione Ctrl+C para encerrar o servidor
echo ========================================
echo.

:: Abrir navegador automaticamente
start http://localhost:8000/login.html

:: Iniciar servidor HTTP
python -m http.server 8000
