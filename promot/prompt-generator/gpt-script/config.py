# config.py
import os
import re

# ── 浏览器选择 ────────────────────────────────────
# 可选值: "chrome" | "edge"
# 默认使用 Chrome，额度用完后自动切换到 Edge
BROWSER = os.getenv("BROWSER", "chrome")

# ── Chrome 配置 ────────────────────────────────────
CHROME_PATH = os.getenv("CHROME_PATH", r"C:\Users\wzy\AppData\Local\Google\Chrome\Application\chrome.exe")
CHROME_DEBUG_PORT = int(os.getenv("CHROME_DEBUG_PORT", "9222"))
CHROME_USER_DATA_DIR = os.getenv("CHROME_USER_DATA_DIR", r"C:\ChromeDebugProfile")

# ── Edge 配置 ──────────────────────────────────────
EDGE_PATH = os.getenv("EDGE_PATH", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
EDGE_DEBUG_PORT = int(os.getenv("EDGE_DEBUG_PORT", "9223"))
EDGE_USER_DATA_DIR = os.getenv("EDGE_USER_DATA_DIR", r"C:\EdgeDebugProfile")

# ── 可配置项 ──────────────────────────────────────
CHATGPT_URL = os.getenv(
    "CHATGPT_URL",
    "https://chatgpt.com/c/6a1063d8-7c1c-83ec-91c0-fa82fecd6d90",
)
OUTPUT_DIR = os.getenv("OUTPUT_DIR", r"D:\桌面\脚本图中")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "3"))       # 秒
MAX_WAIT = int(os.getenv("MAX_WAIT", "120"))               # 秒
SEND_DELAY = int(os.getenv("SEND_DELAY", "2"))             # 发送间隔秒

# ── 页面选择器 ─────────────────────────────────────
# ChatGPT 输入框（ProseMirror contenteditable div）
INPUT_SELECTOR = '.ProseMirror[contenteditable="true"]'
# 发送按钮（通过 aria-label 定位）
SEND_BUTTON_SELECTOR = 'button.composer-submit-button-color, button[aria-label*="发送"], button[aria-label*="Send"]'
# assistant 消息中的生成图片
IMAGE_SELECTOR = 'img[src*="oaidalleapiprodscus"]'
# 更宽泛的图片选择器（备用）
IMAGE_SELECTOR_FALLBACK = '.markdown img, .assistant-message img, [class*="message"] img[src*="http"]'

# ── 内容政策拒绝检测 ──────────────────────────────
# 当 ChatGPT 拒绝生成图片时，页面会显示这些关键词
CONTENT_POLICY_KEYWORDS = [
    "内容政策",
    "违反了我们的",
    "content policy",
    "violates our",
    "抱歉，该提示",
    "无法生成",
    "cannot generate",
    "inappropriate",
    "不合适",
]

# ── 免费额度限制检测 ──────────────────────────────
# 当触发免费额度限制时，页面会显示这些关键词
FREE_PLAN_LIMIT_KEYWORDS = [
    "free plan limit",
    "免费额度",
    "hit the free plan",
    "upgrade your plan",
    "升级到付费",
    "已达到免费",
    "免费计划限制",
]
# 检测拒绝消息的 CSS 选择器（assistant 消息文本）
ASSISTANT_MESSAGE_SELECTOR = '.markdown, .assistant-message, [class*="message-content"]'

# ── 文件解析 ──────────────────────────────────────
# 匹配 "数字. 内容" 格式（支持英文句号、中英文逗号、中文顿号）
_PROMPT_RE = re.compile(r"^\s*(\d+)\s*[.．。,，、]\s+(.+)$")


def load_prompts(filepath: str) -> list[tuple[str, str]]:
    """
    读取 txt 文件，返回 [(标号, 文字), ...] 列表。

    支持的格式：
      1. A cute cat          ← 数字 + 英文句号
      1．A cute cat          ← 数字 + 全角句号
      1。A cute cat          ← 数字 + 中文句号
      1、夕阳下的海滩        ← 数字 + 中文顿号
      1, Cyberpunk city      ← 数字 + 英文逗号
      1，Cyberpunk city      ← 数字 + 中文逗号
      纯文本行               ← 无标号，自动递增编号

    空行自动跳过。
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Prompt file not found: {filepath}")

    prompts = []
    next_num = 1
    with open(filepath, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            m = _PROMPT_RE.match(line)
            if m:
                num = m.group(1)
                prompts.append((num, m.group(2)))
                # 更新下一个自动编号，确保不重复
                try:
                    next_num = int(num) + 1
                except ValueError:
                    next_num += 1
            else:
                # 无标号行，自动递增编号
                prompts.append((str(next_num), line))
                next_num += 1
    return prompts
