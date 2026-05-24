# 多人物 + 详细服饰姿势 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持单人和多人物同框模式，姿势拆为3子项，服饰拆为4子项，AI推荐和提示词生成适配。

**Architecture:** 重构 StyleSettings → 结构化 pose/clothing；CharacterStep重做多人管理；SettingsStep/PromptStep适配新结构；style/prompt API支持结构化返回和多人物。

**Tech Stack:** Next.js 14 App Router, TypeScript, shadcn/ui, TailwindCSS, LongCat API

---

### Task 1: 重构类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 写入新类型**

新内容：
- `PoseDetail { body, expression, camera }` 替代 `pose: string`
- `ClothingDetail { top, bottom, shoes, accessory }` 替代 `clothing: string`
- 新增 `GroupMode`, `CharacterGroup`
- 新增 `defaultPose()`, `defaultClothing()`, `defaultSettings()` 工厂函数
- 保留 `CharacterInfo`, `Orientation`, `PromptResult` 不变

（完整代码见设计文档 `docs/superpowers/specs/2026-05-22-multi-character-detailed-style.md`）

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat(types): 重构 StyleSettings 为结构化姿势/服饰，新增 CharacterGroup"
```

---

### Task 2: 更新 /api/style — 结构化选项池

**Files:**
- Modify: `src/app/api/style/route.ts`

- [ ] **Step 1: 修改选项池**

原 `posePool` → 拆为 `bodyPool`(18项), `expressionPool`(15项), `cameraPool`(10项)
原 `clothingPool` → 拆为 `topPool`(14项), `bottomPool`(13项), `shoesPool`(11项), `accessoryPool`(13项)
`backgroundPool`, `artStylePool`, `lightingPool`, `tonePool`, `compositionPool` 保持不变

- [ ] **Step 2: 修改请求格式**

`characterName: string` → `characterNames: string`（支持多个人名拼接）

- [ ] **Step 3: 修改返回格式**

```json
{
  "pose": { "body": "...", "expression": "...", "camera": "..." },
  "clothing": { "top": "...", "bottom": "...", "shoes": "...", "accessory": "..." },
  "background": "...",
  "artStyle": "...",
  "lighting": "...",
  "tone": "...",
  "composition": "..."
}
```

- [ ] **Step 4: 提交**

```bash
git add src/app/api/style/route.ts
git commit -m "feat(api): style 接口返回结构化姿势/服饰子项"
```

---

### Task 3: 更新 /api/prompt — 支持多人物

**Files:**
- Modify: `src/app/api/prompt/route.ts`

- [ ] **Step 1: 修改请求格式**

`character: CharacterInfo` → `characters: CharacterInfo[]`
新增 `mode?: GroupMode`, `interactions?: string`

- [ ] **Step 2: 修改提示词构建**

- 遍历 `characters` 构建多人物描述
- `mode === 'group'` 时在提示词末尾追加多人物同框指令
- `interactions` 有值时追加人物互动描述
- 风格搭配部分展开 pose/clothing 的所有子项

- [ ] **Step 3: max_tokens 从 2048 提升到 3072**

- [ ] **Step 4: 提交**

```bash
git add src/app/api/prompt/route.ts
git commit -m "feat(api): prompt 接口支持多人物同框生成"
```

---

### Task 4: 重做 CharacterStep

**Files:**
- Modify: `src/components/CharacterStep.tsx`

- [ ] **Step 1: 修改 Props**

```
characters: CharacterInfo[]       (原 character: CharacterInfo | null)
mode: GroupMode                   (新增)
interactions: string              (新增)
onConfirm(characters, mode, interactions)  (原 onConfirm(character))
onModeChange(mode)                (新增)
onInteractionsChange(v)           (新增)
```

- [ ] **Step 2: 顶部模式切换**

两个大按钮：`[单人模式]` / `[多人同框]`，选中态高亮

- [ ] **Step 3: 人物列表渲染**

- `.map` 遍历 `characters`
- 每个人物：折叠卡片，头部显示 `#序号 + 名