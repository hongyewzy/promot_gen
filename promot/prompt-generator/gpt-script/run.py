# -*- coding: utf-8 -*-
"""
GPT 批量图片生成 - 一键启动
双击 启动.bat 运行
"""
import subprocess
import sys
import os
import time
import socket
import tkinter as tk
from tkinter import filedialog
from config import (
    BROWSER,
    CHROME_PATH, CHROME_DEBUG_PORT, CHROME_USER_DATA_DIR,
    EDGE_PATH, EDGE_DEBUG_PORT, EDGE_USER_DATA_DIR,
)

# 切换到脚本所在目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

MAIN_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "main.py")

# main.py 退出码：0=完成, 1=错误, 2=额度用完需要切换浏览器
EXIT_FREE_PLAN_LIMIT = 2


def get_browser_config(browser_type: str) -> tuple:
    """返回 (浏览器路径, 调试端口, 用户数据目录)"""
    if browser_type == "edge":
        return EDGE_PATH, EDGE_DEBUG_PORT, EDGE_USER_DATA_DIR
    return CHROME_PATH, CHROME_DEBUG_PORT, CHROME_USER_DATA_DIR


def check_browser(port: int) -> bool:
    """检查浏览器调试端口是否就绪"""
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect(("localhost", port))
        s.close()
        return True
    except Exception:
        return False


def start_browser(browser_type: str) -> bool:
    """启动指定浏览器并等待调试端口就绪"""
    browser_path, debug_port, user_data_dir = get_browser_config(browser_type)
    if not os.path.exists(browser_path):
        print(f"[错误] 未找到 {browser_type}: {browser_path}")
        return False
    subprocess.Popen(
        [browser_path, f"--remote-debugging-port={debug_port}", f"--user-data-dir={user_data_dir}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for i in range(15):
        time.sleep(2)
        if check_browser(debug_port):
            return True
    return False


def select_file():
    """弹出文件选择框"""
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    filepath = filedialog.askopenfilename(
        title="选择提示词文件",
        filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")],
    )
    root.destroy()
    return filepath


def run_main(prompt_file: str, browser_type: str) -> int:
    """运行 main.py，返回退出码"""
    _, debug_port, _ = get_browser_config(browser_type)
    env = os.environ.copy()
    env["BROWSER"] = browser_type
    env["DEBUG_PORT"] = str(debug_port)
    result = subprocess.run([sys.executable, MAIN_SCRIPT, prompt_file], env=env)
    return result.returncode


def main():
    print("=" * 50)
    print("  GPT 批量图片生成")
    print("=" * 50)
    print()

    # 1. 获取文件路径：优先命令行参数，否则弹出选择框
    if len(sys.argv) > 1 and os.path.isfile(sys.argv[1]):
        prompt_file = sys.argv[1]
        print(f"使用文件: {os.path.basename(prompt_file)}")
    else:
        print("请选择提示词文件...")
        prompt_file = select_file()
        if not prompt_file:
            print("未选择文件，已退出")
            input("按回车退出")
            return

    print(f"文件: {os.path.basename(prompt_file)}")
    print()

    # 2. 检查/启动浏览器
    current_browser = BROWSER
    print(f"[当前浏览器: {current_browser}]")

    browser_path, debug_port, _ = get_browser_config(current_browser)
    if check_browser(debug_port):
        print(f"[{current_browser} 已就绪]")
    else:
        print(f"[启动 {current_browser}...]")
        if not start_browser(current_browser):
            # 主浏览器启动失败，尝试备用浏览器
            fallback = "edge" if current_browser == "chrome" else "chrome"
            print(f"[尝试备用浏览器: {fallback}]")
            current_browser = fallback
            browser_path, debug_port, _ = get_browser_config(current_browser)
            if not start_browser(current_browser):
                print("[错误] 所有浏览器启动失败")
                input("按回车退出")
                return

    # 3. 运行主脚本
    print()
    print("[开始执行...]")
    print()
    exit_code = run_main(prompt_file, current_browser)

    # 4. 如果额度用完，自动切换浏览器继续
    if exit_code == EXIT_FREE_PLAN_LIMIT:
        fallback = "edge" if current_browser == "chrome" else "chrome"
        print()
        print("=" * 50)
        print(f"  [{current_browser}] 免费额度已用完")
        print(f"  自动切换到 [{fallback}] 继续执行")
        print("=" * 50)
        print()

        current_browser = fallback
        browser_path, debug_port, _ = get_browser_config(current_browser)
        if check_browser(debug_port):
            print(f"[{fallback} 已就绪]")
        else:
            print(f"[启动 {fallback}...]")
            if not start_browser(fallback):
                print(f"[错误] {fallback} 启动失败，剩余提示词未处理")
                input("按回车退出")
                return

        print()
        print("[继续执行剩余提示词...]")
        print()
        exit_code = run_main(prompt_file, current_browser)

    print()
    print("=" * 50)
    if exit_code == 0:
        print("  执行完成！图片已保存到 D:\\桌面\\脚本图中")
    else:
        print(f"  执行结束 (退出码: {exit_code})")
    print("=" * 50)
    input("按回车退出")


if __name__ == "__main__":
    main()
