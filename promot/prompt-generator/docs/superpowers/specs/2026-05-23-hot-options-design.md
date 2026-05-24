# 热门选项动态获取功能设计

> **For agentic workers:** 本文件为设计规格文档，实现计划见 `docs/superpowers/plans/2026-05-23-hot-options.md`。

## 目标

将 SettingsStep 和 style API 中写死的姿势、表情、服装、配饰、背景等选项，改为每次从 AI 实时搜索获取热门选项，保持内容新鲜。画风、光影、构图保持写死不变。

## 架构

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/app/api/hot-options/route.ts` | 后端 API，调用 LongCat 搜索热门选项，返回分类选项列表，带 1 小时缓存 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/components/SettingsStep.tsx` | 加载时调用 hot-options API 获取热门选项，替换写死的列表 |
| `src/app/api/style/route.ts` | AI 推荐时调用 hot-options API 获取最新选项池，替换写死的 pool |

## 数据流

```
用户进入 SettingsStep
  → useEffect 调用 /api/hot-options
  → 后端检查缓存（1小时内有效）
    → 有缓存：直接返回
    → 无缓存：调用 LongCat 搜索 → 解析返回 → 缓存1小时 → 返回
  → 前端用返回的热门选项渲染标签选择器

用户点击"AI 热门推荐"
  → 调用 /api/style
  → style API 调用 /api/hot-options 获取最新选项池
  → 用最新选项池让 AI 推荐
```

## API 设计

### GET /api/hot-options

**返回格式：**
```json
{
  "body": ["姿势1", "姿势2", ...],
  "expression": ["表情1", "表情2", ...],
  "camera": ["镜头1", "镜头2", ...],
  "top": ["上装1", "上装2", ...],
  "bottom": ["下装1", "下装2", ...],
  "shoes": ["鞋子1", "鞋子2", ...],
  "accessory": ["配饰1", "配饰2", ...],
  "background": ["背景1", "背景2", ...],
  "cached": false,
  "updatedAt": "2026-05-23T15:00:00Z"
}
```

**缓存策略：** 内存缓存，1 小时过期。用 `Map` 存储，key 固定为 `hot-options`。

**AI 搜索 Prompt：**
让 LongCat 搜索当前网上最热门的二次元 AI 生图提示词选项，覆盖姿势、表情、服装、配饰、背景等维度，每个维度返回 8-10 个热门选项。搜索范围不限，只要是热门的人物相关选项即可，但最终生成的图片风格是二次元。

## 边界处理

- AI 返回格式异常时：返回写死的默认选项（兜底）
- AI 调用超时（>15s）：返回写死的默认选项
- 缓存命中时：直接返回，不调用 AI
- 写死的画风、光影、构图选项不参与动态获取
