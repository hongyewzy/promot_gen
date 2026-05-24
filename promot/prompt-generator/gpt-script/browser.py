# browser.py
import asyncio
import json
import os
import shutil
from typing import Optional
from playwright.async_api import async_playwright
from config import (
    CHATGPT_URL,
    INPUT_SELECTOR,
    SEND_BUTTON_SELECTOR,
    IMAGE_SELECTOR,
    IMAGE_SELECTOR_FALLBACK,
)

COOKIE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.json")
USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chrome_user_data")

# 模块级变量，用于 patch 测试
playwright = async_playwright


def _clean_lock_files():
    """清理 Chrome user data 目录中的锁文件"""
    lock_files = ["SingletonLock", "SingletonCookie", "SingletonSocket", "lockfile"]
    for name in lock_files:
        path = os.path.join(USER_DATA_DIR, name)
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


async def connect_browser():
    """
    连接浏览器。
    优先通过 CDP 连接本地已运行的浏览器（端口从环境变量 DEBUG_PORT 读取）。
    如果失败，则启动 Playwright 自带的 Chromium（使用持久化上下文保存登录态）。
    """
    pw = await async_playwright().start()

    # 从环境变量读取调试端口（支持 Chrome 9222 / Edge 9223）
    debug_port = int(os.environ.get("DEBUG_PORT", "9222"))

    # 尝试 CDP 连接
    try:
        browser = await pw.chromium.connect_over_cdp(f"http://localhost:{debug_port}")
        for ctx in browser.contexts:
            if ctx.pages:
                return ctx.pages[0]
        page = await browser.contexts[0].new_page()
        await page.goto(CHATGPT_URL, wait_until="domcontentloaded")
        return page
    except Exception:
        pass

    # 回退：启动持久化 Chromium
    os.makedirs(USER_DATA_DIR, exist_ok=True)
    _clean_lock_files()

    try:
        context = await pw.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
    except Exception:
        shutil.rmtree(USER_DATA_DIR, ignore_errors=True)
        os.makedirs(USER_DATA_DIR, exist_ok=True)
        context = await pw.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=False,
            viewport={"width": 1280, "height": 900},
        )

    page = context.pages[0] if context.pages else await context.new_page()

    try:
        await page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_load_state("networkidle", timeout=30000)
    except Exception:
        pass

    return page


async def save_cookies(page):
    """保存 cookies 到文件，用于下次自动登录"""
    ctx = page.context
    cookies = await ctx.cookies()
    with open(COOKIE_FILE, "w", encoding="utf-8") as f:
        json.dump(cookies, f, indent=2)
    return {c["name"]: c["value"] for c in cookies}


async def send_prompt(page, text: str):
    """在输入框中输入文字并发送。"""
    await page.wait_for_selector(INPUT_SELECTOR, state="visible", timeout=30000)
    await page.click(INPUT_SELECTOR)
    await asyncio.sleep(0.3)
    await page.keyboard.press("Control+a")
    await page.keyboard.type(text, delay=30)
    await asyncio.sleep(0.3)
    await page.wait_for_selector(SEND_BUTTON_SELECTOR, state="visible", timeout=10000)
    await page.click(SEND_BUTTON_SELECTOR)


async def get_image_count(page) -> int:
    """返回页面中 DALL-E 生成图片的数量。"""
    images = await page.query_selector_all(IMAGE_SELECTOR)
    if not images:
        images = await page.query_selector_all(IMAGE_SELECTOR_FALLBACK)
    return len(images)


async def get_latest_image_url(page) -> Optional[str]:
    """获取页面中最新生成的图片 URL。"""
    images = await page.query_selector_all(IMAGE_SELECTOR)
    if not images:
        images = await page.query_selector_all(IMAGE_SELECTOR_FALLBACK)
    if not images:
        return None
    last_img = images[-1]
    src = await last_img.get_attribute("src")
    return src


async def get_cookies(page) -> dict:
    """获取页面 cookies，用于下载图片时携带。"""
    ctx = page.context
    cookies = await ctx.cookies()
    return {c["name"]: c["value"] for c in cookies}
