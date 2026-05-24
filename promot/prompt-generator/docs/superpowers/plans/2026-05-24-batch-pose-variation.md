# 批量生成姿态差异化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-steps. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 批量生成图片时，为每个人物分配不同的姿态，避免所有人姿态完全相同。

**Architecture:** 将 SettingsStep 中的姿态选项池导出为 `export const`，在 PromptStep 的 `generateAll()` 中为每个人物随机分配不同的姿态组合，基于用户选择的基准姿态进行变化。

**Tech Stack:** React, TypeScript, Next.js

---

## 文件改动总览

| 文件 | 改动类型 | 改动内容 |
|------|----------|----------|
| `src/components/SettingsStep.tsx` | 修改 | 将 `BODY_OPTIONS`、`EXPRESSION_OPTIONS`、`CAMERA_OPTIONS` 改为 `export const` |
| `src/components/PromptStep.tsx` | 修改 | 新增 `generateVariedSettings()` 函数，修改 `generateAll()` 使用差异化姿态 |

---

### Task 1: 导出姿态选项池

**Files:**
- Modify: `src/components/SettingsStep.tsx:20-45`

- [ ] **Step 1: 修改 BODY_OPTIONS 为 export const**

在 `const BODY_OPTIONS` 前加 `export`：

```typescript
export const BODY_OPTIONS = [
  '正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲',
  '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然',
  '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧',
];
```

- [ ] **Step 2: 修改 EXPRESSION_OPTIONS 为 export const**

```typescript
export const EXPRESSION_OPTIONS = [
  '淡然微笑，嘴角微微上扬', '冷酷面无表情，眼神锐利', '温柔含笑，眼神柔和',
  '微微惊讶，眼眸睁大', '害羞低头，面带红晕', '傲娇嘟嘴，脸颊微鼓',
  '忧郁沉思，目光看向下方', '妩媚撩发，嘴角带笑',
];
```

- [ ] **Step 3: 修改 CAMERA_OPTIONS 为 export const**

```typescript
export const CAMERA_OPTIONS = [
  '正面平视，标准半身中景', '低角度仰拍，突出人物高大', '高角度俯拍，显娇小可爱',
  '侧面45度，轮廓分明', '怼脸特写，面部占满画面', '广角全景，人物与场景融合',
  '背影镜头，营造神秘感', '鱼眼透视，夸张戏剧效果',
];
```

- [ ] **Step 4: 验证编译**

Run: `cd "D:\桌面\promot\promot\prompt-generator" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: 提交**

```bash
git add src/components/SettingsStep.tsx
git commit -m "$(cat <<'EOF'
refactor: 导出姿态选项池供其他模块复用

Co-Authored-By: Claude Opus 4.7 <<EMAIL>>
EOF
)"
```

---

### Task 2: 新增姿态分配工具函数

**Files:**
- Modify: `src/components/PromptStep.tsx:1-15`（文件顶部导入区域）
- Modify: `src/components/PromptStep.tsx:25-62`（generateAll 函数前）

- [ ] **Step 1: 添加导入**

在文件顶部导入区域添加：

```typescript
import { BODY_OPTIONS, EXPRESSION_OPTIONS, CAMERA_OPTIONS } from '@/components/SettingsStep';
```

完整导入区域变为：

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Copy, Sparkles, CheckCircle, MessageSquareText, Download, FileText } from 'lucide-react';
import type { CharacterInfo, StyleSettings, PromptResult } from '@/types';
import { BODY_OPTIONS, EXPRESSION_OPTIONS, CAMERA_OPTIONS } from '@/components/SettingsStep';
```

- [ ] **Step 2: 新增 generateVariedSettings 函数**

在 `generateAll` 函数之前添加：

```typescript
/**
 * 为批量生成中的每个人物生成差异化的姿态设置
 * @param baseSettings 用户选择的基准姿态
 * @param characterIndex 当前人物索引（0 开始）
 * @param totalCharacters 总人物数
 * @returns 差异化后的 settings
 */
function generateVariedSettings(
  baseSettings: StyleSettings,
  characterIndex: number,
  totalCharacters: number
): StyleSettings {
  // 第 0 个人物使用用户选择的基准姿态
  if (characterIndex === 0) {
    return baseSettings;
  }

  // 从预设池中随机选取，确保与基准姿态不同
  const pickDifferent = (options: string[], baseValue: string): string => {
    const filtered = options.filter((opt) => opt !== baseValue);
    // 如果过滤后为空（基准值不在池中），返回随机值
    const pool = filtered.length > 0 ? filtered : options;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  return {
    ...baseSettings,
    pose: {
      body: pickDifferent(BODY_OPTIONS, baseSettings.pose.body),
      expression: pickDifferent(EXPRESSION_OPTIONS, baseSettings.pose.expression),
      camera: pickDifferent(CAMERA_OPTIONS, baseSettings.pose.camera),
    },
  };
}
```

- [ ] **Step 3: 验证编译**

Run: `cd "D:\桌面\promot\promot\prompt-generator" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: 提交**

```bash
git add src/components/PromptStep.tsx
git commit -m "$(cat <<'EOF'
feat: 新增 generateVariatedSettings 工具函数

Co-Authored-By: Claude Opus 4.7 <<EMAIL>>
EOF
)"
```

---

### Task 3: 修改 generateAll 使用差异化姿态

**Files:**
- Modify: `src/components/PromptStep.tsx:38-42`

- [ ] **Step 1: 修改 generateAll 中的 settings 传入**

将：

```typescript
const res = await fetch('/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    characters: [characters[i]],
    settings,
  }),
});
```

改为：

```typescript
const variedSettings = generateVariedSettings(settings, i, characters.length);
const res = await fetch('/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    characters: [characters[i]],
    settings: variedSettings,
  }),
});
```

- [ ] **Step 2: 验证编译**

Run: `cd "D:\桌面\promot\promot\prompt-generator" && npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: 提交**

```bash
git add src/components/PromptStep.tsx
git commit -m "$(cat <<'EOF'
feat: 批量生成时为每个人物分配不同姿态

- 第 1 个人物使用用户选择的基准姿态
- 其他人从预设池中随机分配不同的身体姿态/表情/镜头角度
- 确保与基准姿态不同，避免所有人姿态完全相同

Co-Authored-By: Claude Opus 4.7 <<EMAIL>>
EOF
)"
```

---

## 验收标准

1. 批量生成时，第 1 个人物使用用户选择的姿态
2. 第 2 个人物及以后，身体姿态/表情/镜头角度与第 1 个不同
3. 每个人物的姿态组合不重复（预设池大小范围内）
4. 单个人物生成不受影响
5. 编译通过，无 TypeScript 错误
