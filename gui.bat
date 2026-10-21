@echo off
:: Launches Portfolio Manager GUI windowlessly (no console window)
:: To see console output/logs, run: gui.bat --console

if "%1"=="--console" (
    python "%~dp0gui.py" %*
) else (
    start "" pythonw "%~dp0gui.py" %*
)
