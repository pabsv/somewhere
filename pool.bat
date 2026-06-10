@echo off
cd /d "%~dp0"
python -m scheduler.pool_scheduler %*
