# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## 语言

始终使用中文回复。

## 项目概览

**AI 生图提示词生成器** — 一个 3 步向导式 Web 应用，帮助用户为 Midjourney / Stable Diffusion / DALL-E 等 AI 生图工具生成中文提示词。

核心流程：
1. **角色查询** — 输入角色名，通过 Tavily 搜索 wiki 资料，再由 LongCat AI 提取结构化外貌特征
2. **风格设置** — 选择构图方向（竖屏/横屏）+ 7 个风格维度，AI 可自动推荐搭配
3. **提示词生成** — 为每个角色生成中文提示词，支持复制、导出 TXT、或自动触发 gpt-script 生图

## 目录结构

```
promot/                          # 工具脚本（debug、文本替换等），非主应用
prompt-generator/                # **主应用：Next.js 项目**
  src/
    app/
      page.tsx                   # 首页，3步向导状态机（客户端组件）
      layout.tsx                 # 根布局，lang=zh-CN
      globals.css                # Tailwind + CSS 变量（亮色/暗色主题）
      api/
        character/route.ts       # POST - 角色特征查询（Tavily + LongCat）
        style/route.ts           # POST - AI 风格推荐
        prompt/route.ts          # POST - 提示词生成
        hot-options/route.ts     # GET  - 热门风格选项（1小时内存缓存）
        save-prompts/route.ts    # POST - 保存 prompts.txt 并触发 gpt-script
    components/
      CharacterStep.tsx          # 步骤1：角色输入、批量查询、预设管理
      SettingsStep.tsx           # 步骤2：方向选择 + 7 个风格维度
      PromptStep.tsx             # 步骤3：提示词生成、复制、导出
      StepIndicator.tsx          # 步骤进度指示器
      TagSelector.tsx            # 标签选择器（复用组件）
      ThemeToggle.tsx            # 暗色/亮色切换
      PresetPanel.tsx            # 预设面板（角色预设 + 组合预设）
      EditPresetDialog.tsx       # 预设编辑对话框
      ui/                        # shadcn/ui 组件（button, card, input, label, skeleton, textarea）
    lib/
      longcat.ts                 # LongCat API 客户端（原生 fetch，/v1/messages）
      tavily.ts                  # Tavily 搜索客户端（wiki 优先的内容提取）
      presets.ts                 # localStorage 预设 CRUD
      utils.ts                   # cn() 类名合并、extractJson() AI 响应 JSON 提取
    types/
      index.ts                   # TypeScript 类型定义 + 默认工厂函数
  gpt-script/                    # Python/Playwright 自动化脚本
    run.py                       # 入口：连接浏览器，读取 prompts.txt，发送 ChatGPT DALL-E
    main.py                      # 核心异步逻辑
    browser.py                   # Playwright 浏览器管理（CDP 连接、Cookie 持久化）
    config.py                    # 配置（浏览器路径、选择器、内容策略检测）
    image_handler.py             # 图片生成监控、下载、重试
    启动.bat                     # Windows 一键启动（创建 venv、安装依赖、运行）
```

## 开发命令

> 所有命令在 `prompt-generator/` 目录下执行。

```bash
cd prompt-generator

# 安装依赖
npm install

# 启动开发服务器（端口 3000）
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run start

# ESLint 检查
npm run lint
```

Windows 用户可直接运行 `prompt-generator/start.bat`，自动检测 Node.js（含 NVM for Windows）、安装依赖、创建 `.env.local`、启动开发服务器。

## 环境变量

在 `prompt-generator/.env.local` 中配置：

| 变量 | 用途 |
|---|---|
| `LONGCAT_API_KEY` | LongCat API 密钥 |
| `LONGCAT_BASE_URL` | LongCat API 地址（默认 `https://api.longcat.chat/anthropic`） |
| `TAVILY_API_KEY` | Tavily 搜索 API 密钥 |

模板见 `.env.local.example`。

## 架构要点

### API 层
- 所有 AI 调用均在服务端 API Route 中执行，密钥不暴露给客户端
- `character` 路由：先 Tavily 搜索 wiki，再用 LongCat 提取结构化特征
- `style` 路由：从选项池中随机选 5 个，让 LongCat 挑最佳搭配
- `prompt`路由：逐个角色生成，使用专业提示词公式
- `hot-options` 路由：1 小时内存缓存，失败时回退到硬编码默认值

### 客户端
- `page.tsx` 是一个大型客户端组件，管理 3 步向导的全部状态
- 预设数据（角色预设、组合预设）存储在 localStorage
- 支持多角色批量查询和逐角色提示词生成

### LongCat 客户端 (`src/lib/longcat.ts`)
- 使用原生 `fetch` 而非 `@anthropic-ai/sdk`（SDK 列在依赖中但未使用）
- 请求 `/v1/messages` 端点，模型 `LongCat-2.0-Preview`
- `extractJson()` 用于从 AI 响应中鲁棒地提取 JSON

### gpt-script 集成
- `save-prompts` 路由将提示词写入 `gpt-script/prompts.txt`，然后通过 `cmd.exe /c` 触发 `启动.bat`
- gpt-script 使用 Playwright 连接 Chrome/Edge（CDP），自动向 ChatGPT DALL-E 发送提示词并下载生成的图片
- 输出目录：`D:\桌面\脚本图中\`

## 路径别名

`@/*` 映射到 `./src/*`（在 `tsconfig.json` 中配置）。

## 技术栈

- **框架：** Next.js 14 + App Router + React 18
- **语言：** TypeScript（严格模式）
- **样式：** TailwindCSS 3.4 + CSS 变量（亮色/暗色）
- **组件库：** shadcn/ui（New York 风格，zinc 基色）+ Radix UI 原语
- **AI：** LongCat（Anthropic 兼容接口）+ Tavily Search
- **自动化：** Python + Playwright

## 注意事项

- `promot/CLAUDE.md` 是旧的行为准则文件，已被本文件取代
- `promot/桌面promotprompt-generator/` 是旧版快照（使用 `@anthropic-ai/sdk` 直接调用 Claude），已废弃
- `prompt-generator/gpt-script/` 是独立的 Python 项目，有自己的虚拟环境
