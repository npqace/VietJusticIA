@echo off
REM Test runner script for VietJusticIA backend (Windows)

echo ==========================================
echo VietJusticIA Backend Test Suite
echo ==========================================
echo.

REM Check if pytest is installed
where pytest >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: pytest is not installed
    echo Install dependencies: pip install -r requirements.txt
    exit /b 1
)

REM Run tests with coverage
pytest --cov=app --cov-report=term-missing --cov-report=html

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo All tests passed! ^^
    echo ==========================================
    echo.
    echo Coverage report generated in htmlcov\index.html
    echo Open it in your browser to view detailed coverage
    exit /b 0
) else (
    echo.
    echo ==========================================
    echo Tests failed! X
    echo ==========================================
    exit /b 1
)

