import asyncio
import os
import time
import urllib.request
import urllib.error
import ssl
from config import (
    POLL_INTERVAL, MAX_WAIT, OUTPUT_DIR,
    IMAGE_SELECTOR, IMAGE_SELECTOR_FALLBACK,
    CONTENT_POLICY_KEYWORDS, ASSISTANT_MESSAGE_SELECTOR,
    FREE_PLAN_LIMIT_KEYWORDS, INPUT_SELECTOR,
)


class ContentPolicyRejected(Exception):
    """ChatGPT 拒绝了提示词（内容政策）"""
    pass


class FreePlanLimitReached(Exception):
    """免费额度用完了，需要停止"""
    pass


class GenerationFailed(Exception):
    """图片生成失败（无图片且无明确拒绝消息）"""
    pass


async def wait_for_generation_complete(page, timeout: int = MAX_WAIT):
    """
    等待 ChatGPT 完成图片生成。

    策略：
    1. 先等输入框恢复可用（ChatGPT 文字回复完成的标志）
    2. 输入框恢复后，再固定等待 90 秒，确保图片真正生成完成
       （ChatGPT 是流式回复，文字出来时图片可能还在生成中）

    超时抛出 TimeoutError。
    """
    MIN_WAIT_AFTER_INPUT = 90  # 输入框恢复后至少再等 90 秒
    elapsed = 0
    input_ready_time = None

    while elapsed < timeout:
        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        if input_ready_time is None:
            # 阶段 1：等待输入框恢复可用
            try:
                input_el = await page.query_selector(INPUT_SELECTOR)
                if input_el:
                    is_disabled = await input_el.get_attribute("disabled")
                    is_readonly = await input_el.get_attribute("aria-disabled")
                    if is_disabled is None and is_readonly is None:
                        input_ready_time = elapsed
            except Exception:
                pass
        else:
            # 阶段 2：输入框已恢复，等待图片生成完成
            if elapsed - input_ready_time >= MIN_WAIT_AFTER_INPUT:
                return

    raise TimeoutError(f"等待 ChatGPT 图片生成超时（{timeout}s）")


async def check_image_or_rejection(page, before_count: int) -> str:
    """
    检查 ChatGPT 回复后的结果。
    返回: "image"（有新图片）/ "rejected"（内容政策拒绝）/ "failed"（生成失败）
    """
    # 检查是否有新图片
    images = await page.query_selector_all(IMAGE_SELECTOR)
    if not images:
        images = await page.query_selector_all(IMAGE_SELECTOR_FALLBACK)

    if len(images) > before_count:
        return "image"

    # 检查是否被内容政策拒绝
    if await _check_content_policy_rejection(page):
        return "rejected"

    # 检查是否触发免费额度限制（需要停止）
    if await _check_free_plan_limit(page):
        raise FreePlanLimitReached("免费额度已用完，停止执行")

    # 检查是否有错误消息（生成失败）
    if await _check_generation_error(page):
        return "failed"

    return "no_result"


async def _check_content_policy_rejection(page) -> bool:
    """检查页面是否显示了内容政策拒绝消息"""
    try:
        elements = await page.query_selector_all(ASSISTANT_MESSAGE_SELECTOR)
        for el in elements:
            text = await el.inner_text()
            if text:
                text_lower = text.lower()
                for keyword in CONTENT_POLICY_KEYWORDS:
                    if keyword.lower() in text_lower:
                        return True
    except Exception:
        pass
    return False


async def _check_free_plan_limit(page) -> bool:
    """检查页面是否显示了免费额度限制消息"""
    try:
        elements = await page.query_selector_all(ASSISTANT_MESSAGE_SELECTOR)
        for el in elements:
            text = await el.inner_text()
            if text:
                text_lower = text.lower()
                for keyword in FREE_PLAN_LIMIT_KEYWORDS:
                    if keyword.lower() in text_lower:
                        return True
    except Exception:
        pass
    return False


async def _check_generation_error(page) -> bool:
    """检查页面是否显示了生成错误消息"""
    error_keywords = [
        "生成失败",
        "无法生成",
        "生成出错",
        "generation failed",
        "error generating",
        "something went wrong",
        "发生了错误",
    ]
    try:
        elements = await page.query_selector_all(ASSISTANT_MESSAGE_SELECTOR)
        for el in elements:
            text = await el.inner_text()
            if text:
                text_lower = text.lower()
                for keyword in error_keywords:
                    if keyword.lower() in text_lower:
                        return True
    except Exception:
        pass
    return False


def download_image(url: str, filepath: str, cookies: dict, max_retries: int = 5):
    """
    下载图片到本地文件，支持自动重试。
    """
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)

    cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "Referer": "https://chatgpt.com/",
        "Cookie": cookie_str,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    last_error = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            opener = urllib.request.build_opener(
                urllib.request.HTTPSHandler(context=ssl_ctx),
            )
            resp = opener.open(req, timeout=30)

            with open(filepath, "wb") as f:
                while True:
                    chunk = resp.read(8192)
                    if not chunk:
                        break
                    f.write(chunk)

            if os.path.getsize(filepath) == 0:
                raise RuntimeError("下载的文件为空")

            return

        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                time.sleep(3 * (attempt + 1))

    raise RuntimeError(f"下载失败（重试 {max_retries} 次）: {last_error}")
