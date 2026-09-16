@echo off
title First View - Resurface Oregon Demo Server + Cloudflare Tunnel
cd /d "%~dp0"
echo ================================================
echo   First View - Demo para cliente
echo   Sitio: Resurface Oregon Construction LLC
echo   Servidor local + tunel publico de Cloudflare
echo   La URL publica se guarda en demo-url.txt
echo   Cierra esta ventana o presiona Ctrl+C para parar
echo ================================================
echo.
python demo.py
echo.
echo El demo se detuvo.
pause
