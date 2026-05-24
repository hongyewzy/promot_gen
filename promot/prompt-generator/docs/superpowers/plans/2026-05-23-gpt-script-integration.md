# GPT 脚本集成到项目

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `D:\桌面\gpt脚本\` 下的 Python 生图脚本搬进项目的 `gpt-script/` 子目录，统一管理代码和 git 版本，同时更新 Next.js 后端路径引用，实现完整闭环。

**Architecture:** 在项目根目录创建 `gpt-script/` 子目录，搬入所有源代码文件（main.py、browser.py、image_handler.py、config.py、run.py、启动.bat、requirements.txt），运行时生成的文件（cookies.json、chrome_user_data/、output/、__pycache__/.venv/、run.log）通过 `.gitignore` 排除。`save-prompts/route.ts` 中的 bat 路径和 prompts.txt 路径更新为相对路径。`启动.bat` 加入自动创建 .venv 和安装依赖的逻辑。

**Tech Stack:** Next.js 14、Python 3.12、Playwright、Git

---

### Task 1: 创建 gpt-script 目录并复制源代码文件

**Files:**
- Create: `gpt-script/`
- Source: `D:\桌面\gpt脚本/` 下的文件

- [ ] **Step 1: 创建目录并复制文件**

```bash
cd "D:\桌面\promot\promot\prompt-generator"
mkdir -p gpt-script
copy "D:\桌面\gpt脚本\main.py" gpt-script\
copy "D:\桌面\gpt脚本\browser.py" gpt-script\
copy "D:\桌面\gpt脚本\image_handler.py" gpt-script\
copy "D:\桌面\gpt脚本\config.py" gpt-script\
copy "D:\桌面\gpt脚本\run.py" gpt-script\
copy "D:\桌面\gpt脚本\启动.bat" gpt-script\
copy "D:\桌面\gpt脚本\requirements.txt" gpt-script\
```

注意：不要复制 `cookies.json`、`chrome_user_data/`、`output/`、`__pycache__/`、`.venv/`、`run.log`、`run.ps1`、`docs/`、`tests/`、`.git/`、`.gitignore`、`.python-version`、`pyproject.toml`、`README.md`、`使用指南.md`、`prompts.txt`、`prompts_sample.txt`、`*.png`、`*.log` 等运行时或非必要文件。

- [ ] **Step 2: 验证文件已复制**

```bash
dir gpt-script\
```

预期输出应包含：`main.py`、`browser.py`、`image_handler.py`、`config.py`、`run.py`、`启动.bat`、`requirements.txt`

---

### Task 2: 创建 gpt-script/.gitignore

**Files:**
- Create: `gpt-script/.gitignore`

- [ ] **Step 1: 创建 .gitignore**

写入以下内容：

```gitignore
# 运行时生成文件
cookies.json
chrome_user_data/
output/
__pycache__/
run.log
prompts.txt
*.png

# 虚拟环境
.venv/
.venv-old/

# Python
.pytest_cache/
.python-version

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 2: 验证文件**

```bash
type gpt-script\.gitignore
```

---

### Task 3: 更新根目录 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 追加 gpt-runtime 排除项**

在文件末尾追加：

```gitignore
# gpt-script runtime
gpt-script/cookies.json
gpt-script/chrome_user_data/
gpt-script/output/
gpt-script/.venv/
gpt-script/run.log
gpt-script/__pycache__/
gpt-script/prompts.txt
gpt-script/*.png
gpt-script/.pytest_cache/
```

- [ ] **Step 2: 验证**

```bash
type .gitignore
```

---

### Task 4: 更新 save-prompts/route.ts 路径为相对路径

**Files:**
- Modify: `src/app/api/save-prompts/route.ts`

- [ ] **Step 1: 读取当前文件**

Read `src/app/api/save-prompts/route.ts`

- [ ] **Step 2: 更新路径**

将：
```typescript
const PROMPTS_DIR = 'D:\\桌面\\gpt脚本';
const PROMPTS_FILE = join(PROMPTS_DIR, 'prompts.txt');
const BAT_FILE = join(PROMPTS_DIR, '启动.bat');
```

改为：
```typescript
const SCRIPT_DIR = join(process.cwd(), 'gpt-script');
const PROMPTS_FILE = join(SCRIPT_DIR, 'prompts.txt');
const BAT_FILE = join(SCRIPT_DIR, '启动.bat');
```

- [ ] **Step 3: 验证修改**

Read 文件确认修改正确。

---

### Task 5: 更新 启动.bat 自动创建虚拟环境和安装依赖

**Files:**
- Modify: `gpt-script/启动.bat`

- [ ] **Step 1: 读取当前文件**

Read `gpt-script/启动.bat`

- [ ] **Step 2: 写入新内容**

将文件内容替换为：

```bat
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
```

- [ ] **Step 3: 验证文件**

```bash
type gpt-script\启动.bat
```

---

### Task 6: 更新 run.py 使用 .venv 中的 Python

**Files:**
- Modify: `gpt-script/run.py`

run.py 本身不需要改动（bat 已经用 `.venv\Scripts\python.exe` 调用它），但需要确认 `main.py` 的调用路径没问题。

- [ ] **Step 1: 确认 run.py 中 MAIN_SCRIPT 路径正确**

Read `gpt-script/run.py`，确认 `MAIN_SCRIPT` 使用的是 `os.path.dirname(os.path.abspath(__file__))`，这在搬入项目后仍然正确。

如果正确，无需修改。

---

### Task 7: 提交所有变更

**Files:**
- All created/modified files

- [ ] **Step 1: 检查 git 状态**

```bash
cd "D:\桌面\promot\promot\prompt-generator"
git status --short
```

预期：`gpt-script/` 下所有源文件为新增，`src/app/api/save-prompts/route.ts` 和 `.gitignore` 为修改。不应有运行时文件（cookies.json、.venv/ 等）出现在待提交列表中。

- [ ] **Step 2: 添加并提交**

```bash
git add gpt-script/ src/app/api/save-prompts/route.ts .gitignore
git commit -m "feat: 将 gpt 生图脚本集成到项目 gpt-script/ 子目录"
```

- [ ] **Step 3: 验证提交**

```bash
git log --oneline -3
```

---

### Task 8: 验证闭环流程

**Files:** N/A（手动验证）

- [ ] **Step 1: 确认文件结构**

```bash
dir gpt-script\
```

确认包含所有 7 个源文件，不含运行时文件。

- [ ] **Step 2: 确认 .gitignore 生效**

```bash
git check-ignore gpt-script/cookies.json
git check-ignore gpt-script/.venv/
git check-ignore gpt-script/run.log
```

每个命令都应输出被忽略的文件路径。

- [ ] **Step 3: 确认 save-prompts 路径正确**

Read `src/app/api/save-prompts/route.ts`，确认 `SCRIPT_DIR` 使用 `process.cwd()` 拼接，`PROMPTS_FILE` 和 `BAT_FILE` 指向 `gpt-script/` 下。
