@echo off
cd /d "%~dp0"
python -m scripts.seed_targets %*
