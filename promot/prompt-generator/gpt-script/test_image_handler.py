"""
TDD: image_handler.py 等待策略测试

核心问题：当前 wait_for_generation_complete 只检测输入框是否恢复可用，
但 ChatGPT 生成图片时，输入框可能在图片还没完成时就恢复了。
需要改为：发送提示词后固定等待 90 秒，确保图片生成完成。
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from image_handler import wait_for_generation_complete, check_image_or_rejection


class TestWaitForGenerationComplete:
    """测试等待图片生成完成的逻辑"""

    @pytest.mark.asyncio
    async def test_等待时间至少90秒(self):
        """发送提示词后应等待至少 90 秒才认为图片生成完成"""
        page = MagicMock()
        # 输入框始终可用（模拟 ChatGPT 流式回复时输入框已恢复）
        input_el = MagicMock()
        input_el.get_attribute = AsyncMock(return_value=None)  # disabled=null, aria-disabled=null
        page.query_selector = AsyncMock(return_value=input_el)

        start = asyncio.get_event_loop().time()
        await wait_for_generation_complete(page, timeout=120)
        elapsed = asyncio.get_event_loop().time() - start

        # 关键断言：等待时间必须 >= 90 秒
        assert elapsed >= 90, f"等待时间只有 {elapsed:.1f}s，应至少 90s"

    @pytest.mark.asyncio
    async def test_输入框恢复后仍需等待(self):
        """即使输入框提前恢复可用，也必须等满 90 秒"""
        page = MagicMock()
        input_el = MagicMock()
        call_count = 0

        async def mock_get_attr(attr):
            nonlocal call_count
            call_count += 1
            return None  # 始终可用

        input_el.get_attribute = mock_get_attr
        page.query_selector = AsyncMock(return_value=input_el)

        start = asyncio.get_event_loop().time()
        await wait_for_generation_complete(page, timeout=120)
        elapsed = asyncio.get_event_loop().time() - start

        # 必须等满 90 秒，不能因为输入框恢复就提前返回
        assert elapsed >= 90, f"输入框恢复就提前返回了，只等了 {elapsed:.1f}s"

    @pytest.mark.asyncio
    async def test_超时时间可配置(self):
        """超时时间应该可配置，默认 120 秒"""
        page = MagicMock()
        page.query_selector = AsyncMock(return_value=None)  # 始终找不到输入框

        with pytest.raises(TimeoutError):
            await wait_for_generation_complete(page, timeout=5)

    @pytest.mark.asyncio
    async def test_正常完成不抛异常(self):
        """在超时前正常完成不应抛异常"""
        page = MagicMock()
        input_el = MagicMock()
        input_el.get_attribute = AsyncMock(return_value=None)
        page.query_selector = AsyncMock(return_value=input_el)

        # 不应抛异常
        await wait_for_generation_complete(page, timeout=120)


class TestCheckImageOrRejection:
    """测试图片检测结果"""

    @pytest.mark.asyncio
    async def test_有新图片返回_image(self):
        """页面有新图片时应返回 'image'"""
        page = MagicMock()
        img1 = MagicMock()
        img2 = MagicMock()
        page.query_selector_all = AsyncMock(return_value=[img1, img2])

        result = await check_image_or_rejection(page, before_count=0)
        assert result == "image"

    @pytest.mark.asyncio
    async def test_图片数量未变返回_no_result(self):
        """图片数量没有变化时应返回 'no_result'"""
        page = MagicMock()
        img1 = MagicMock()
        page.query_selector_all = AsyncMock(return_value=[img1])

        result = await check_image_or_rejection(page, before_count=1)
        assert result == "no_result"

    @pytest.mark.asyncio
    async def test_内容政策拒绝返回_rejected(self):
        """检测到内容政策拒绝时应返回 'rejected'"""
        page = MagicMock()
        # 没有新图片
        page.query_selector_all = AsyncMock(return_value=[])
        # 但有拒绝消息
        msg_el = MagicMock()
        msg_el.inner_text = AsyncMock(return_value="抱歉，该提示违反了我们的内容政策")
        page.query_selector_all = AsyncMock(side_effect=lambda sel: {
            'img[src*="oaidalleapiprodscus"]': [],
            '.markdown img, .assistant-message img, [class*="message"] img[src*="http"]': [],
            '.markdown, .assistant-message, [class*="message-content"]': [msg_el],
        }.get(sel, []))

        result = await check_image_or_rejection(page, before_count=0)
        assert result == "rejected"
