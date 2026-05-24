# AI 生图提示词生成器 - 代码修复计划

> **For agentic workers:** REQUIRED SUBKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 review 中发现的 3 个高优先级问题：character API 未校验 error 字段、所有 catch 块丢失错误信息、JSON 解析脆弱。

**Architecture:** 修改 3 个文件：`src/app/api/character/route.ts`（加 error 校验）、`src/app/api/prompt/route.ts`（加 error 校验 + 健壮 JSON 解析）、`src/components/PromptStep.tsx`（catch 加 console.error）。`src/lib/longcat.ts` 删除未使用的 `LongcatMessage` 接口。

**Tech Stack:** Next.js 14, TypeScript, LongCat API

---

### Task 1: 删除未使用的 LongcatMessage 接口

**Files:**
- Modify: `prompt-generator/src/lib/longcat.ts`

- [ ] **Step 1: 删除 LongcatMessage 接口定义**

删除 `longcat.ts` 中的 `LongcatMessage` 接口，因为没有任何文件使用它。保留 `LONGCAT_MODEL` 导出和 `longcat` 对象。

修改后文件内容：

```typescript
const LONGCAT_API_KEY = process.env.LONGCAT_API_KEY;
const LONGCAT_BASE_URL = process.env.LONGCAT_BASE_URL || 'https://api.longcat.chat/anthropic';
export const LONGCAT_MODEL = 'LongCat-2.0-Preview';

export const longcat = {
  messages: {
    create: async (params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    }) => {
      const response = await fetch(`${LONGCAT_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LONGCAT_API_KEY}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`LongCat API error: ${response.status} ${errText}`);
      }

      return response.json();
    },
  },
};
```

- [ ] **Step 2: 构建验证**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认无 TypeScript 错误。

- [ ] **Step 3: 提交**

```bash
git add src/lib/longcat.ts
git commit -m "chore: remove unused LongcatMessage interface"
```

---

### Task 2: 修复 character API 的 error 字段校验

**Files:**
- Modify: `prompt-generator/src/app/api/character/route.ts`

- [ ] **Step 1: 修改 route.ts，增加 error 字段校验和健壮 JSON 解析**

问题：LongCat 返回 `{ error: "..." }` 时，代码会把它当成正常数据返回。

修改后完整内容：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';

function extractJson(text: string): string | null {
  // 找到第一个 { 和最后一个 } 之间的内容
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.substring(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }

    const message = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `请搜索并描述人物「${name}」的外貌形象特征，返回 JSON 格式：
{
  "name": "人物姓名",
  "hairColor": "发色（如：黑色、金色、银白色）",
  "hairstyle": "发型（如：双马尾、短发、长发披肩）",
  "eyeColor": "瞳色（如：蓝色、红色、绿色）",
  "skinColor": "肤色（如：白皙、小麦色、古铜色）",
  "clothing": "衣着风格（如：校服、古装、赛博朋克风）",
  "other": "其他重要特征（如：耳环、伤疤、特殊配饰）"
}
只返回 JSON，不要其他内容。所有值用中文。`,
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Character API: no JSON found in response:', text.substring(0, 200));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonStr);

    // 校验 LongCat 是否返回了 error
    if (parsed.error) {
      console.error('Character API returned error:', parsed.error);
      return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 });
    }

    // 校验必要字段
    if (!parsed.name || typeof parsed.name !== 'string') {
      console.error('Character API: missing name field:', JSON.stringify(parsed).substring(0, 200));
      return NextResponse.json({ error: 'AI 返回数据不完整，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      name: parsed.name,
      hairColor: parsed.hairColor || '',
      hairstyle: parsed.hairstyle || '',
      eyeColor: parsed.eyeColor || '',
      skinColor: parsed.skinColor || '',
      clothing: parsed.clothing || '',
      other: parsed.other || '',
    });
  } catch (e) {
    console.error('Character API error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 构建验证**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认无 TypeScript 错误。

- [ ] **Step 3: 提交**

```bash
git add src/app/api/character/route.ts
git commit -m "fix: add error validation and robust JSON parsing for character API"
```

---

### Task 3: 修复 prompt API 的 error 字段校验和 JSON 解析

**Files:**
- Modify: `prompt-generator/src/app/api/prompt/route.ts`

- [ ] **Step 1: 修改 route.ts，增加 error 校验 + 健壮 JSON 解析 + catch 日志**

修改后完整内容：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import type { CharacterInfo, Orientation } from '@/types';

function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.substring(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const { character, orientation, feedback } = await req.json() as {
      character: CharacterInfo;
      orientation?: Orientation;
      feedback?: string;
    };

    if (!character) {
      return NextResponse.json({ error: '缺少人物数据' }, { status: 400 });
    }

    const aspectRatio = orientation === 'landscape' ? '16:9' : '9:16';
    const orientationText = orientation === 'landscape' ? '横屏（16:9，适合电脑壁纸）' : '竖屏（9:16，适合手机壁纸）';

    let userPrompt = `请根据以下人物信息生成 AI 生图提示词。

人物信息：
- 姓名：${character.name}
- 发色：${character.hairColor}
- 发型：${character.hairstyle}
- 瞳色：${character.eyeColor}
- 肤色：${character.skinColor}
- 衣着：${character.clothing}
- 其他特征：${character.other}

画面方向：${orientationText}

请按以下模板结构生成风格描述：
[核心描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [风格质感] + [光影氛围]

- 核心描述：年龄、身份
- 面部细节：肤色、眼神、瞳色、五官特征
- 发型发色：长度、质感、细节
- 服装配饰：材质、装饰、配饰
- 动作姿势：站姿/坐姿/回眸/俯视/怼脸拍等
- 风格质感：高级CG插画、BJD质感、伪厚涂、8K超清等
- 光影氛围：镜头视角、光线、环境

参考示例：
"20多岁古代男子，高级CG概念插画，模糊感，高清晰度，额前碎发，背景全黑，黑发全披发，精致五官，冷白皮，戴黑色斗笠围黑纱，黑夜窗边茶桌，冷酷眼神仰拍，歪头侧脸，手拿酒壶，怼脸拍。"

请返回 JSON 格式：
{
  "chinese": "完整的中文描述，将人物特征和风格特征融合成一段流畅的文字",
  "english": "英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar ${aspectRatio} --v 6"
}`;

    if (feedback) {
      userPrompt += `\n\n用户对上一版提示词提出了以下修改意见，请根据意见调整生成：\n"${feedback}"`;
    }

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Prompt API: no JSON found in response:', text.substring(0, 200));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.error) {
      console.error('Prompt API returned error:', parsed.error);
      return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      chinese: parsed.chinese || '',
      english: parsed.english || '',
    });
  } catch (e) {
    console.error('Prompt API error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 构建验证**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认无 TypeScript 错误。

- [ ] **Step 3: 提交**

```bash
git add src/app/api/prompt/route.ts
git commit -m "fix: add error validation and robust JSON parsing for prompt API"
```

---

### Task 4: 修复 PromptStep catch 块丢失错误信息

**Files:**
- Modify: `prompt-generator/src/components/PromptStep.tsx`

- [ ] **Step 1: 修改 generatePrompt 的 catch 块，增加 console.error**

找到 `PromptStep.tsx` 中的 `generatePrompt` 函数，将：

```ts
} catch {
  setError('生成提示词失败，请重试');
}
```

改为：

```ts
} catch (e) {
  console.error('Generate prompt error:', e);
  setError('生成提示词失败，请重试');
}
```

- [ ] **Step 2: 构建验证**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认无 TypeScript 错误。

- [ ] **Step 3: 提交**

```bash
git add src/components/PromptStep.tsx
git commit -m "fix: add console.error to catch blocks in PromptStep"
```

---

### Task 5: 最终验证

**Files:**
- Verify: 全部文件

- [ ] **Step 1: 完整构建**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认零错误。

- [ ] **Step 2: 启动开发服务器验证**

```bash
npm run dev
```

访问 http://localhost:3000，走完整流程：
1. 输入人物名 → 查询 → 确认
2. 选择横屏/竖屏
3. 生成提示词 → 检查中英文输出
4. 点击「提出修改意见」→ 输入意见 → 重新生成

- [ ] **Step 3: 提交最终版本**

```bash
git add .
git commit -m "chore: final verification after review fixes"
```
