# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ 语言

**始终使用中文回复。** 所有解释、代码注释、提交信息和面向用户的文本都应为中文。

## 开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动 Next.js 开发服务器（端口 3000） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 Next.js ESLint |

Windows 用户使用 `start.bat`（自动检查依赖、创建 `.env.local`、运行 `npm run dev`）。

### 环境配置

复制 `.env.local.example` 为 `.env.local` 并填写：
- `LONGCAT_API_KEY` — 美团 LongCat API 密钥（必需）
- `LONGCAT_BASE_URL` — 默认 `https://api.longcat.chat/anthropic`
- `MODELSCOPE_API_KEY` / `MODELSCOPE_BASE_URL` — 已配置但未使用

## 项目概述

**AI 生图提示词生成器** — 用户输入角色名，AI 查询角色视觉特征，用户配置风格设置，生成 Midjourney/Stable Diffusion 用的中英双语提示词。

- **框架：** Next.js 14.2.25，App Router，React 18，TypeScript（严格模式）
- **样式：** TailwindCSS 3.4 + shadcn/ui（New York 风格，zinc 基础，CSS 变量）
- **AI API：** 美团 LongCat（Anthropic 兼容格式），通过原生 `fetch()` 调用 — **不使用** `@anthropic-ai/sdk`（列为依赖但未使用）
- **无测试、无 CI/CD** — 未配置测试框架

## 架构

### 3 步向导（主 UI 流程位于 `src/app/page.tsx`）

1. **CharacterStep** (`src/components/CharacterStep.tsx`) — 用户输入角色名 + 可选来源（游戏/动漫/漫画/小说）。调用 `/api/character` → LongCat AI 返回结构化特征（发色、瞳色、发型、肤色、体型、标记）。结果可编辑。支持预设系统（localStorage 存储），包括人物预设和分组预设。
2. **SettingsStep** (`src/components/SettingsStep.tsx`) — 用户选择方向（竖屏 9:16 或横屏 16:9）+ 7 个风格维度（姿势、服装、背景、画风、光影、色调、构图）。可选"AI 热门推荐"通过 `/api/style`。热门选项由 `/api/hot-options` 提供（带 1 小时内存缓存 + 写死兜底）。
3. **PromptStep** (`src/components/PromptStep.tsx`) — 通过 `/api/prompt` 为每个人物单独生成提示词。支持复制到剪贴板、导出 TXT、自动保存到 `gpt-script/prompts.txt` 并触发 `启动.bat`。

### API 路由（全部 POST，Next.js Route Handlers）

- `src/app/api/character/route.ts` — 查询角色特征
- `src/app/api/style/route.ts` — 获取 AI 风格推荐
- `src/app/api/prompt/route.ts` — 生成提示词（支持反馈迭代）
- `src/app/api/hot-options/route.ts` — 获取热门选项（GET，1 小时缓存）
- `src/app/api/save-prompts/route.ts` — 保存提示词到文件系统并触发外部脚本

### 关键共享模块

- `src/lib/longcat.ts` — LongCat API 客户端（原生 `fetch()`，Bearer token 认证，`/v1/messages` 端点）
- `src/lib/utils.ts` — `cn()`（类名合并）+ `extractJson()`（括号匹配提取最外层 JSON 对象）
- `src/lib/presets.ts` — localStorage 预设 CRUD（人物预设 + 分组预设）
- `src/types/index.ts` — `CharacterInfo`、`StyleSettings`、`PromptResult` 及相关类型

### 组件库

- `src/components/ui/` — shadcn/ui 基础组件：button、card、input、label、skeleton、textarea
- `src/components/StepIndicator.tsx` — 步骤进度指示器
- `src/components/ThemeToggle.tsx` — 暗黑/亮色模式切换（使用 `.dark` 类 + CSS 变量）
- `src/components/TagSelector.tsx` — 标签选择器（用于风格选项）
- `src/components/PresetPanel.tsx` — 预设管理面板
- `src/components/EditPresetDialog.tsx` — 编辑预设对话框

### 路径别名

`@/*` 映射到 `./src/*`（在 `tsconfig.json` 中配置）

### 外部集成

- `gpt-script/` 目录（位于 `D:\桌面\gpt脚本\`）包含 Python + Playwright 脚本，用于将生成的提示词发送到外部 AI 绘图工具（很可能是 Midjourney 或类似工具）的浏览器界面
- `启动.bat` → `python run.py prompts.txt` — 读取提示词文件，通过 Playwright 控制浏览器自动发送

## 重要注意事项

- `src/lib/longcat.ts` 使用原生 `fetch()`，不是 Anthropic SDK。除非明确要求，不要重构为使用 SDK。
- `extractJson()` 使用括号匹配（首个 `{` 到对应 `}`）。AI 响应包含多个 JSON 对象时可能解析错误。
- 原始设计规格（`docs/superpowers/specs/`）包含使用 ModelScope Qwen 的壁纸分析功能 — 已被风格设置步骤替代，**未实现**。
- 尽管配置了环境变量，但不存在 `modelscope.ts` 客户端。
- 仓库根目录的临时文件（`debug*.js`、`do_replace.js` 等）是开发产物，不属于应用。
- 提示词生成后会自动添加方向标签（`【手机壁纸·竖屏9:16构图】` 或 `【电脑壁纸·横屏16:9构图】`）。
- 提示词格式为 `[来源名称，角色名]提示词内容` 前缀格式。
