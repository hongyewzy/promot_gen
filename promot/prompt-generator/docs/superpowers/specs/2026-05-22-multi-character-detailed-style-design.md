# 多人物 + 详细服饰姿势 设计规范

> 2026-05-22

## 需求概述

1. **服饰更详细**：从单个"服饰风格"拆分为上装、下装、鞋子、配饰 4 个子项
2. **姿势更详细**：从单个"人物姿势"拆分为身体姿态、表情、镜头角度 3 个子项
3. **支持多人物**：单人模式和多人同框模式，共用一套风格设置，但允许单独微调

## 数据模型

### StyleSettings 重构

```typescript
export interface PoseDetail {
  body: string;      // 身体姿态：站姿/坐姿/回眸/战斗姿态...
  expression: string; // 表情：微笑/冷酷/沉思/惊讶...
  camera: string;    // 镜头角度：怼脸特写/仰拍/俯视/侧面...
}

export interface ClothingDetail {
  top: string;       // 上装
  bottom: string;    // 下装
  shoes: string;     // 鞋子
  accessory: string; // 配饰
}

export interface StyleSettings {
  orientation: Orientation;
  pose: PoseDetail;
  clothing: ClothingDetail;
  background: string;
  artStyle: string;
  lighting: string;
  tone: string;
  composition: string;
}
```

### 多人物支持

```typescript
export type GroupMode = 'single' | 'group';

export interface CharacterGroup {
  characters: CharacterInfo[];  // 多个人物
  mode: GroupMode;              // 单人 / 同框
  interactions?: string;        // 人物互动描述（同框模式），如"背靠背站立"、"对视"
}
```

## UI 流程

### 步骤1 — 人物管理（CharacterStep 重做）

- 顶部切换：`[单人模式]` / `[多人同框模式]`
- 单人模式：和现在一致，输入角色名 → AI 查询 → 编辑特征
- 多人模式：
  - 人物列表，每个角色独立输入框 + 查询按钮
  - `+ 添加人物` 按钮，至少 2 人，最多 5 人
  - 每个人物卡片可折叠/展开，显示特征编辑
  - 人物可拖拽排序，可删除（至少保留 2 人）
  - 多人物时显示"互动描述"输入框

### 步骤2 — 画面设置（SettingsStep 增强）

- 姿势区域：3 个子项输入框（身体姿态 / 表情 / 镜头角度）
- 服饰区域：4 个子项输入框（上装 / 下装 / 鞋子 / 配饰）
- AI 推荐时分别推荐每个子项
- 其余 5 个维度不变

### 步骤3 — 生成提示词（PromptStep 增强）

- 单人模式：和现在一致
- 多人模式：
  - 显示综合提示词（包含所有人物 + 互动描述）
  - 可复制整体提示词

## API 变化

### /api/character — 支持批量查询
- 接收 `names: string[]`
- 返回 `CharacterInfo[]`
- 逐个串行调用 LongCat

### /api/style — 结构化返回
- `pose` → `{ body, expression, camera }`
- `clothing` → `{ top, bottom, shoes, accessory }`
- 各子项有独立选项池

### /api/prompt — 支持多人物
- 接收 `characters: CharacterInfo[]` + `mode` + `interactions`
- 单人模式：和现在一致
- 多人模式：生成包含所有人物特征 + 互动关系的综合描述

## 改动文件

| 文件 | 改动程度 |
|------|---------|
| `src/types/index.ts` | 重构 StyleSettings，新增 CharacterGroup/GroupMode |
| `src/components/CharacterStep.tsx` | 重做，支持多人物列表 |
| `src/components/SettingsStep.tsx` | 中等，姿势/服饰子项输入 |
| `src/components/PromptStep.tsx` | 较小，多人物提示词展示 |
| `src/app/page.tsx` | 中等，适配新数据流 |
| `src/app/api/character/route.ts` | 中等，支持批量查询 |
| `src/app/api/style/route.ts` | 中等，结构化返回 |
| `src/app/api/prompt/route.ts` | 较大，支持多人物生成 |
