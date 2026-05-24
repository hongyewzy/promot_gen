@echo off
cd /d "%~dp0"

if not exist .venv (
    echo 正在创建虚拟环境...
    python -m venv .venv
    echo 正在安装依赖...
    .venv\Scripts\pip.exe install -r requirements.txt
    echo 正在安装 Playwright 浏览器...
    .venv\Scripts\playwright.exe install chromium
)

.venv\Scripts\python.exe run.py "%~1"