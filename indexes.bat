@echo off
cd /d "%~dp0"
python -m database.setup_indexes %*
