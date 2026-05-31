REM @echo off
SET VENV_DIR=.venv

:: Check if the virtual environment directory exists
if not exist "%VENV_DIR%" (
    echo [INFO] Virtual environment not found. Creating one...
    python -m venv %VENV_DIR%
    
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment. Make sure Python is installed and in your PATH.
        pause
        exit /b %errorlevel%
    )
    
    echo [INFO] Virtual environment created successfully.
    echo [INFO] Installing requirements...
    
    :: Activate venv and install requirements
    call %VENV_DIR%\Scripts\activate
    python -m pip install --upgrade pip
) else (
    echo [INFO] Virtual environment found. Activating...
    call %VENV_DIR%\Scripts\activate
)
pip install -r requirements.txt
:: Run the Python application
echo [INFO] Starting app.py...
python app.py

:: Keep the window open if the app crashes or closes
pause