@echo off
cd /d "%~dp0"
uvicorn api.main:app --reload --port 9000
