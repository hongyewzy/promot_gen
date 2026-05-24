# 画风新增海报/公告/电影宣传 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在步骤 2 的画风选择中新增"海报风格"、"公告风格"、"电影宣传风格"三个选项，选择后提示词自动融入对应风格描述。

**Architecture:** 复用现有 `artStyle` 字段和标签选择器 UI，在 `ART_STYLE_OPTIONS` 数组末尾追加三个带描述文本的选项。提示词生成无需改动，因为 `artStyle` 值会自然嵌入 `styleParts`。

**Tech Stack:** React, TypeScript, Next.js, TailwindCSS, shadcn/ui

---

## 文件改动总览

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `src/components/SettingsStep.tsx` | 修改 | `ART_STYLE_OPTIONS` 数组新增 3 个选项 |

**无需改动的文件：**
- `src/types/index.ts` — 类型定义不变
- `src/app/api/prompt/route.ts` — 提示词生成逻辑不变
- `src/app/api/style/route.ts` — AI 推荐逻辑不变
- `src/app/api/hot-options/route.ts` — 热门选项逻辑不变

---

### Task 1: 新增画风选项

**Files:**
- Modify: `src/components/SettingsStep.tsx:101-106`

- [ ] **Step 1: 定位 ART_STYLE_OPTIONS 数组**

文件位置：`src/components/SettingsStep.tsx` 第 101-106 行

```typescript
const ART_STYLE_OPTIONS = [
  '日系动漫插画，赛璐璐平涂', '日系厚涂，笔触厚重有质感', '游戏CG插画，电影级光影',
  '韩漫风格，精致唯美', '新海诚风格，光影绝美', '京都动画风，清新细腻',
  '吉卜力手绘，温暖治愈', '国风工笔画，古典雅致', '赛博朋克，霓虹暗调',
  '浮世绘，日式传统版画', '概念艺术，电影分镜感', '3D渲染，虚幻引擎5质感',
];
```

- [ ] **Step 2: 在数组末尾新增三个选项**

在 `'3D渲染，虚幻引擎5质感',` 后面追加：

```typescript
  '海报风格，竖版构图，视觉冲击力强，适合宣传展示',
  '公告风格，横版横幅，包含标题文字区域，信息清晰',
  '电影宣传风格，电影级光影，叙事感强，适合剧照海报',
];
```

完整数组变为：

```typescript
const ART_STYLE_OPTIONS = [
  '日系动漫插画，赛璐璐平涂', '日系厚涂，笔触厚重有质感', '游戏CG插画，电影级光影',
  '韩漫风格，精致唯美', '新海诚风格，光影绝美', '京都动画风，清新细腻',
  '吉卜力手绘，温暖治愈', '国风工笔画，古典雅致', '赛博朋克，霓虹暗调',
  '浮世绘，日式传统版画', '概念艺术，电影分镜感', '3D渲染，虚幻引擎5质感',
  '海报风格，竖版构图，视觉冲击力强，适合宣传展示',
  '公告风格，横版横幅，包含标题文字区域，信息清晰',
  '电影宣传风格，电影级光影，叙事感强，适合剧照海报',
];
```

- [ ] **Step 3: 验证改动**

运行：`npm run build`

预期输出：`✓ Compiled successfully`（无 TypeScript 错误）

- [ ] **Step 4: 提交**

```bash
git add src/components/SettingsStep.tsx
git commit -m "$(cat <<'EOF'
feat: 画风新增海报/公告/电影宣传三个选项

- 海报风格：竖版构图，视觉冲击力强
- 公告风格：横版横幅，包含标题文字区域
- 电影宣传风格：电影级光影，叙事感强
- 不选时按原逻辑生成，保持向后兼容

Co-Authored-By: Claude Opus 4.7 <<EMAIL>>
EOF
)"
```

---

## 验收标准

1. 步骤 2（画面设置）画风选择器中显示 15 个选项（12 个原有 + 3 个新增）
2. 选中"海报风格"后，生成的提示词包含"竖版构图，视觉冲击力强，适合宣传展示"
3. 选中"公告风格"后，生成的提示词包含"横版横幅，包含标题文字区域，信息清晰"
4. 选中"电影宣传风格"后，生成的提示词包含"电影级光影，叙事感强，适合剧照海报"
5. 不选任何画风时，提示词按原逻辑生成（无画风描述）
6. 画幅方向（竖屏/横屏）与风格独立，用户自由选择
7. AI 热门推荐功能正常，不受影响
