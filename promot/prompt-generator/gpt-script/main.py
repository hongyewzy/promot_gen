# main.py
import asyncio
import os
import sys
import logging
import re

from config import load_prompts, OUTPUT_DIR, SEND_DELAY, INPUT_SELECTOR
from browser import connect_browser, send_prompt, get_image_count, get_latest_image_url, get_cookies, save_cookies
from image_handler import (
    wait_for_generation_complete, check_image_or_rejection,
    download_image, ContentPolicyRejected, FreePlanLimitReached,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("run.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)


def extract_character_name(text: str) -> str | None:
    """从提示词文字中提取人物名，格式：[来源，人物名]描述"""
    m = re.match(r'^\[([^\]]+)\]', text)
    if m:
        inner = m.group(1)
        # 取逗号/顿号后面的人物名
        for sep in [',', '，', '、']:
            if sep in inner:
                return inner.split(sep)[-1].strip()
        return inner.strip()
    return None


_used_names: dict[str, int] = {}


def make_filename(number: str, text: str) -> str:
    """生成图片文件名：人物名_序号.png，无人物名则用标号"""
    name = extract_character_name(text)
    if not name:
        return f"{number}.png"
    count = _used_names.get(name, 0) + 1
    _used_names[name] = count
    return f"{name}_{count}.png"


async def main(prompt_file: str):
    # 重置文件名计数器
    _used_names.clear()

    # 1. 读取提示词
    prompts = load_prompts(prompt_file)
    if not prompts:
        logger.error("没有找到有效的提示词，退出")
        return

    logger.info(f"共 {len(prompts)} 条提示词待处理")

    # 2. 连接浏览器
    logger.info("正在启动/连接浏览器...")
    try:
        page = await connect_browser()
    except Exception as e:
        logger.error(f"启动浏览器失败: {e}")
        sys.exit(1)

    # 检查是否需要登录（通过检测聊天输入框是否存在）
    logger.info("检查登录状态...")
    await page.wait_for_timeout(2000)

    logged_in = False
    try:
        await page.wait_for_selector(INPUT_SELECTOR, state="visible", timeout=5000)
        logged_in = True
    except Exception:
        pass

    if not logged_in:
        logger.info("=" * 50)
        logger.info("检测到未登录，请在浏览器中完成登录")
        logger.info("脚本将自动检测登录状态（最多等待 10 分钟）...")
        logger.info("=" * 50)
        try:
            await page.wait_for_selector(INPUT_SELECTOR, state="visible", timeout=600000)
            logged_in = True
        except Exception:
            pass

    if not logged_in:
        logger.error("登录超时（10 分钟），请重新运行脚本")
        sys.exit(1)

    logger.info("登录成功，保存 cookies...")
    await save_cookies(page)

    # 导航到目标对话
    if "/c/" not in page.url:
        await page.goto("https://chatgpt.com/c/6a1063d8-7c1c-83ec-91c0-fa82fecd6d90", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

    logger.info("连接成功")

    # 3. 获取 cookies（用于下载）
    cookies = await get_cookies(page)

    # 4. 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 5. 记录初始图片数量
    initial_count = await get_image_count(page)
    logger.info(f"页面当前图片数量: {initial_count}")

    # 6. 主循环
    success = []
    skipped = []
    failed = []

    for idx, (number, text) in enumerate(prompts):
        logger.info(f"[{idx + 1}/{len(prompts)}] 处理标号 {number}: {text}")

        try:
            # 记录发送前的图片数量
            before_count = await get_image_count(page)

            # 发送提示词
            await send_prompt(page, text)
            logger.info("已发送，等待 ChatGPT 图片生成完成（约 90s）...")

            # 等待 ChatGPT 图片生成完成（输入框恢复后再等 90s）
            await wait_for_generation_complete(page)

            # 图片渲染缓冲
            await asyncio.sleep(3)

            # 检查结果：有图片 / 被拒绝 / 生成失败
            result = await check_image_or_rejection(page, before_count)

            if result == "rejected":
                logger.warning(f"标号 {number} 被跳过（内容政策拒绝）: {text[:50]}...")
                skipped.append((number, "内容政策拒绝"))
                await asyncio.sleep(SEND_DELAY)
                continue

            if result == "failed":
                logger.warning(f"标号 {number} 被跳过（生成失败）: {text[:50]}...")
                skipped.append((number, "生成失败"))
                await asyncio.sleep(SEND_DELAY)
                continue

            if result == "image":
                # 提取图片 URL
                img_url = await get_latest_image_url(page)
                if not img_url:
                    raise RuntimeError("无法提取图片 URL")

                logger.info(f"图片 URL: {img_url[:80]}...")

                # 下载，文件名使用人物名
                filename = make_filename(number, text)
                filepath = os.path.join(OUTPUT_DIR, filename)
                try:
                    download_image(img_url, filepath, cookies)
                except Exception:
                    logger.info("下载失败，刷新 cookies 后重试...")
                    cookies = await get_cookies(page)
                    await save_cookies(page)
                    download_image(img_url, filepath, cookies)
                logger.info(f"已保存: {filepath}")
                success.append(number)
            else:
                # 没有新图片，也没有检测到拒绝/错误消息
                # 可能是生成还在进行中，再等一会儿
                logger.info(f"标号 {number} 未检测到结果，额外等待 10 秒...")
                await asyncio.sleep(10)
                result2 = await check_image_or_rejection(page, before_count)
                if result2 == "image":
                    img_url = await get_latest_image_url(page)
                    if img_url:
                        filename = make_filename(number, text)
                        filepath = os.path.join(OUTPUT_DIR, filename)
                        download_image(img_url, filepath, cookies)
                        logger.info(f"已保存: {filepath}")
                        success.append(number)
                    else:
                        skipped.append((number, "无法提取图片"))
                else:
                    skipped.append((number, "未生成图片"))

            # 发送间隔（最后一条不需要等）
            if idx < len(prompts) - 1:
                await asyncio.sleep(SEND_DELAY)

        except FreePlanLimitReached as e:
            logger.error(f"免费额度已用完，停止执行: {e}")
            failed.append((number, str(e)))
            # 抛出异常让外层捕获，返回退出码 2
            raise SystemExit(2)
        except TimeoutError as e:
            logger.error(f"标号 {number} 超时: {e}")
            failed.append((number, str(e)))
            await asyncio.sleep(SEND_DELAY)
        except Exception as e:
            logger.error(f"标号 {number} 失败: {e}")
            failed.append((number, str(e)))
            await asyncio.sleep(SEND_DELAY)

    # 7. 输出报告
    logger.info("=" * 50)
    logger.info(f"执行完成！成功: {len(success)}/{len(prompts)}，跳过: {len(skipped)}，失败: {len(failed)}")
    if skipped:
        logger.info("跳过列表:")
        for num, reason in skipped:
            logger.info(f"  标号 {num}: {reason}")
    if failed:
        logger.info("失败列表:")
        for num, reason in failed:
            logger.info(f"  标号 {num}: {reason}")
    logger.info(f"图片保存在: {os.path.abspath(OUTPUT_DIR)}/")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python main.py <prompts.txt>")
        sys.exit(1)

    try:
        asyncio.run(main(sys.argv[1]))
    except SystemExit:
        raise
    except Exception as e:
        logger.error(f"未捕获的异常: {e}")
        sys.exit(1)
