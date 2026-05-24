# 批量生成姿态差异化设计

**日期：** 2026-05-24  
**状态：** 已批准

## 问题

批量生成图片时，每个人物的动作姿态完全一样，因为 `PromptStep.tsx` 的 `generateAll()` 为每个人物传入相同的 `settings`（包含相同的 `pose.body`、`pose.expression`、`pose.camera`）。

## 目标

批量生成时，每个人物的姿态应有所不同，基于用户选择的基准姿态进行随机变化。

## 设计方案

### 1. 导出预设选项池

**改动文件：** `src/components/SettingsStep.tsx`

将姿态选项数组改为 `export const`，供其他模块引用：

```typescript
export const BODY_OPTIONS = [...];
export const EXPRESSION_OPTIONS = [...];
export const CAMERA_OPTIONS = [...];
```

### 2. 新增姿态分配工具函数

**改动文件：** `src/components/PromptStep.tsx`

新增 `generateVariedSettings()` 函数：

```typescript
function generateVariedSettings(
  baseSettings: StyleSettings,
  characterIndex: number,
  totalCharacters: number
): StyleSettings {
  // 1. 第 0 个人物使用用户选择的基准姿态
  // 2. 其他人从预设池中随机选取，确保与基准不同
  // 3. 如果人物数量超过预设池大小，循环使用但尽量错开
}
```

### 3. 修改 `generateAll()` 调用逻辑

**改动文件：** `src/components/PromptStep.tsx`

在循环中为每个人物生成不同的 `settings`：

```typescript
for (let i = 0; i < characters.length; i++) {
  const variedSettings = generateVariedSettings(settings, i, characters.length);
  const res = await fetch('/api/prompt', {
    method: 'POST',
    body: JSON.stringify({
      characters: [characters[i]],
      settings: variedSettings,  // 使用差异化后的 settings
    }),
  });
  // ...
}
```

## 无需改动的文件

- `src/app/api/prompt/route.ts` — 无需改动，因为它只是接收 `settings` 并生成提示词
- `src/types/index.ts` — 无需改动

## 向后兼容

- 单个人物生成时不受影响（`characterIndex === 0` 时使用基准姿态）
- 用户选择的姿态仍然作为第一个人物的姿态
