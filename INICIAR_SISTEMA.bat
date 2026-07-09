@echo off
title Ecossistema NEP - Servidor Local
color 0A

echo ========================================
echo   Ecossistema NEP - Iniciando sistema
echo ========================================
echo.

cd /d "%~dp0"

:: Verifica se as dependencias estao instaladas
if not exist "node_modules" (
    echo Instalando dependencias pela primeira vez...
    echo.
    call npm install
    echo.
)

:: Verifica se a porta 3000 ja esta em uso (servidor ja rodando)
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo A porta 3000 ja esta em uso - o servidor provavelmente ja esta rodando.
    echo Abrindo o navegador direto...
    start http://localhost:3000/login.html
    echo.
    echo Se a pagina nao abrir, feche o outro servidor e rode este .bat de novo.
    pause
    exit /b
)

echo Iniciando servidor na porta 3000...
echo.
echo Acesse: http://localhost:3000/login.html
echo.
echo Para encerrar, feche esta janela ou pressione Ctrl+C
echo ========================================
echo.

:: Abre o navegador na tela de login apos 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/login.html"

:: Inicia o servidor Vite
call npm run dev
