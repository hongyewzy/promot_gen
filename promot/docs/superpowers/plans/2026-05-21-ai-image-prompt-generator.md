# AI 生图提示词生成器 Implementation Plan

> **For agentic workers:** REQUIRED SUBKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Web 应用，用户输入人物名字，LongCat AI 查询人物形象，用户选择参考壁纸，Qwen3.5-9B 分析壁纸风格（不可用时 LongCat 降级），最终合成双语 AI 生图提示词。

**Architecture:** Next.js 14 App Router 单页应用，三步流程（人物查询 → 壁纸选择 → 提示词生成）。两套 API：美团 LongCat（文本生成 + 降级风格生成）+ 魔塔 Qwen3.5-9B（图片风格分析）。

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui, 美团 LongCat API, 魔塔 ModelScope API

---

### Task 1: 更新环境变量配置

**Files:**
- Modify: `prompt-generator/.env.local.example`
- Create: `prompt-generator/.env.local`

- [ ] **Step 1: 更新 .env.local.example**

写入以下内容：

```
LONGCAT_API_KEY=your_longcat_api_key_here
LONGCAT_BASE_URL=https://api.longcat.chat/anthropic
MODELSCOPE_API_KEY=your_modelscope_api_key_here
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn
```

- [ ] **Step 2: 创建 .env.local 并填入真实 Key**

```
LONGCAT_API_KEY=ak_2uZ1Gq5uV1Mx8ZD40C3ze8fd1Aw4P
LONGCAT_BASE_URL=https://api.longcat.chat/anthropic
MODELSCOPE_API_KEY=ms-16484e53-5c3b-47e6-9117-e02489fdc191
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn
```

- [ ] **Step 3: 提交**

语法：git add .env.local.example && git commit -m "chore: update env config for LongCat + ModelScope"

---

### Task 2: 创建 LongCat API 客户端

**Files:**
- Create: `prompt-generator/src/lib/longcat.ts`

- [ ] **Step 1: 创建 LongCat 客户端**

创建 `src/lib/longcat.ts`，用 Anthropic SDK 连接 LongCat API：

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const longcat = new Anthropic({
  apiKey: process.env.LONGCAT_API_KEY,
  baseURL: process.env.LONGCAT_BASE_URL,
});

export const LONGCAT_MODEL = "LongCat-2.0-Preview";
```

- [ ] **Step 2: 检查 @anthropic-ai/sdk 是否已安装**

```bash
cat package.json | grep anthropic
```

如果没有，需要安装（注意：现有项目可能用不同方式调用 LongCat，根据实际情况调整）。

如果已有 anthropic SDK，直接复用即可，只需修改 baseURL 和 apiKey。

- [ ] **Step 3: 提交**

---

### Task 3: 创建 ModelScope Qwen API 客户端

**Files:**
- Create: `prompt-generator/src/lib/modelscope.ts`

- [ ] **Step 1: 创建 ModelScope 客户端**

创建 `src/lib/modelscope.ts`：

```typescript
const MODELSCOPE_BASE_URL = process.env.MODESCOPE_BASE_URL || "https://api-inference.modelscope.cn";
const MODELSCOPE_API_KEY = process.env.MODESCOPE_API_KEY;
const QWEN_MODEL = "Qwen/Qwen3.5-9B";

interface ModelScopeResponse {
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
  }>;
  output?: {
    text?: string;
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
}

export async function analyzeImageWithQwen(
  imageUrl: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `${MODELSCOPE_BASE_URL}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MODELSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ModelScope API error: ${response.status} ${response.statusText}`);
  }

  const data: ModelScopeResponse = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    data?.output?.choices?.[0]?.message?.content ||
    data?.output?.text ||
    ""
  );
}
```

- [ ] **Step 2: 提交**

---

### Task 4: 更新类型定义

**Files:**
- Modify: `prompt-generator/src/types/index.ts`

- [ ] **Step 1: 确认类型定义包含 WallpaperStyle 的 action 字段和 isFallback**

完整类型：

```typescript
export interface CharacterAttributes {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinColor: string;
  clothingStyle: string;
  other: string;
}

export interface Character {
  id: string;
  name: string;
  attributes: CharacterAttributes;
}

export interface WallpaperStyle {
  artStyle: string;      // 风格（赛博朋克、古风等）
  pose: string;          // 姿势（站立、坐姿等）
  expression: string;    // 神态（微笑、冷漠等）
  clothing: string;      // 衣着（制服、古装等）
  background: string;    // 背景（城市夜景、森林等）
  action: string;        // 动作（回眸、俯视、怼脸拍等）
  lighting: string;      // 光线（逆光、霓虹灯光等）
  colorTone: string;     // 色调（冷色调、暖色调等）
}

export interface Wallpaper {
  id: string;
  url: string;
  thumbnailUrl: string;
  style?: WallpaperStyle;
  isFallback?: boolean;  // true = 来自降级模板
}

export interface Prompt {
  characterId: string;
  wallpaperId: string;
  chinese: string;
  english: string;
}

export type Step = 1 | 2 | 3;
```

- [ ] **Step 2: 提交**

---

### Task 5: 更新人物查询 API（改为 LongCat）

**Files:**
- Modify: `prompt-generator/src/app/api/character/route.ts`

- [ ] **Step 1: 重写 route.ts 使用 LongCat API**

核心逻辑：
- 接收 `{ name: string }`
- 调用 LongCat，prompt 要求搜索人物外貌特征，返回 JSON
- 解析并返回结构化数据

```typescript
import { longcat, LONGCAT_MODEL } from "@/lib/longcat";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const response = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `请搜索并描述动漫/虚拟人物「${name}」的外貌形象特征，返回 JSON 格式：
{
  "hairColor": "发色",
  "hairStyle": "发型",
  "eyeColor": "瞳色",
  "skinColor": "肤色",
  "clothingStyle": "衣着风格",
  "other": "其他重要特征"
}
只返回 JSON，不要其他内容。`,
        },
      ],
    });

    const text = (response.content[0] as any)?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const attributes = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      name,
      attributes: {
        hairColor: attributes.hairColor || "",
        hairStyle: attributes.hairStyle || "",
        eyeColor: attributes.eyeColor || "",
        skinColor: attributes.skinColor || "",
        clothingStyle: attributes.clothingStyle || "",
        other: attributes.other || "",
      },
    });
  } catch (error: any) {
    console.error("Character search error:", error);
    return NextResponse.json(
      { error: error.message || "搜索失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 提交**

---

### Task 6: 更新壁纸分析 API（Qwen + LongCat 降级）

**Files:**
- Modify: `prompt-generator/src/app/api/analyze/route.ts`

- [ ] **Step 1: 重写 analyze API 实现降级逻辑**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { analyzeImageWithQwen } from "@/lib/modelscope";
import { longcat, LONGCAT_MODEL } from "@/lib/longcat";

const STYLE_PROMPT = `请分析这张图片的艺术风格，返回 JSON 格式：
{
  "artStyle": "艺术风格（如赛博朋克、古风、日系等）",
  "pose": "人物姿势（如站立、坐姿、回眸等）",
  "expression": "神态（如微笑、冷漠、沉思等）",
  "clothing": "衣着风格（如制服、古装、休闲等）",
  "background": "背景描述（如城市夜景、森林、室内等）",
  "action": "动作描述（如俯视、怼脸拍、侧脸等）",
  "lighting": "光线（如逆光、霓虹灯光、自然光等）",
  "colorTone": "色调（如冷色调、暖色调、高饱和等）"
}
只返回 JSON，不要其他内容。`;

const FALLBACK_PROMPT = `请根据以下人物描述，生成一套生图用的风格关键词。

使用模板结构：
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

要求返回两个字段：
1. style: JSON，包含 artStyle, pose, expression, clothing, background, action, lighting, colorTone
2. prompt: 一串连续的中文描述（参考示例风格）

返回 JSON 格式：{"style": {...}, "prompt": "..."}`;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, characterName } = await req.json();

    // 优先尝试 Qwen 图片分析
    if (imageUrl) {
      try {
        const qwenResult = await analyzeImageWithQwen(imageUrl, STYLE_PROMPT);
        const jsonMatch = qwenResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const style = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ style, isFallback: false });
        }
      } catch (qwenError) {
        console.warn("Qwen analysis failed, falling back to LongCat:", qwenError);
      }
    }

    // 降级：LongCat 按模板生成
    const name = characterName || "动漫人物";
    const response = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${FALLBACK_PROMPT}\n\n人物：${name}`,
        },
      ],
    });

    const text = (response.content[0] as any)?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      style: result.style || {
        artStyle: "高级CG插画",
        pose: "站立",
        expression: "自然",
        clothing: "",
        background: "",
        action: "正面",
        lighting: "自然光",
        colorTone: "中性色调",
      },
      fallbackPrompt: result.prompt || "",
      isFallback: true,
    });
  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error.message || "分析失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 提交**

---

### Task 7: 更新提示词生成 API

**Files:**
- Modify: `prompt-generator/src/app/api/prompt/route.ts`

- [ ] **Step 1: 重写 prompt 生成 API，合成双语提示词**

请求体包含 character、wallpaperStyle，以及可选的 fallbackPrompt。

Prompt 合成时，将人物特征 + 风格特征结合，生成：
1. 中文描述：完整的一句话描述
2. 英文提示词：适合 Midjourney/SD 的关键词组合

```typescript
import { longcat, LONGCAT_MODEL } from "@/lib/longcat";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { character, wallpaperStyle, fallbackPrompt } = await req.json();

    const style = wallpaperStyle || {};
    const charAttrs = character?.attributes || {};

    const userPrompt = `请根据以下信息生成 AI 生图提示词。

人物：${character?.name || "未知"}
发色：${charAttrs.hairColor || ""}
发型：${charAttrs.hairStyle || ""}
瞳色：${charAttrs.eyeColor || ""}
肤色：${charAttrs.skinColor || ""}
衣着：${charAttrs.clothingStyle || ""}
其他特征：${charAttrs.other || ""}

风格特征：
- 艺术风格：${style.artStyle || ""}
- 姿势：${style.pose || ""}
- 神态：${style.expression || ""}
- 衣着风格：${style.clothing || ""}
- 背景：${style.background || ""}
- 动作：${style.action || ""}
- 光线：${style.lighting || ""}
- 色调：${style.colorTone || ""}
${fallbackPrompt ? `\n参考风格描述：${fallbackPrompt}` : ""}

请返回 JSON 格式：
{
  "chinese": "完整的中文描述，将人物特征和风格特征融合成一段流畅的文字",
  "english": "英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar 3:4 --v 6"
}`;

    const response = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = (response.content[0] as any)?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      chinese: result.chinese || "",
      english: result.english || "",
    });
  } catch (error: any) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      { error: error.message || "生成失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 提交**

---

### Task 8: 更新 UI 组件适配新 API

**Files:**
- Modify: `prompt-generator/src/components/WallpaperStep.tsx`
- Modify: `prompt-generator/src/components/PromptStep.tsx`
- Modify: `prompt-generator/src/app/page.tsx`

- [ ] **Step 1: WallpaperStep - 适配 analyze API 返回值**

- 请求 body 新增 `characterName` 字段（降级时使用）
- 响应处理 `isFallback` 字段，为 true 时显示提示："⚠️ 图片分析不可用，使用默认风格模板"
- Wallpaper 对象保存 `isFallback` 状态

- [ ] **Step 2: PromptStep - 适配 prompt API 返回值**

- 请求 body 新增 `fallbackPrompt` 字段
- 响应展示 `chinese` 和 `english`

- [ ] **Step 3: page.tsx - 传递新增字段**

确保步骤间数据传递包含 `isFallback`、`fallbackPrompt` 等新字段。

- [ ] **Step 4: 提交**

---

### Task 9: 验证和构建测试

**Files:**
- Verify: 全部文件

- [ ] **Step 1: 确保 LongCat 客户端正确**

检查 `src/lib/anthropic.ts` 和 `src/lib/longcat.ts` 不冲突。如果原 `anthropic.ts` 已连接 LongCat（根据用户配置），则直接复用，不需要新建文件。

- [ ] **Step 2: 构建测试**

```bash
cd D:\桌面\promot\prompt-generator
npm run build
```

确认无 TypeScript 错误。

- [ ] **Step 3: 端到端流程验证**

启动 `npm run dev`，完整走一遍三步流程：
1. 输入人物名 → 查询 → 确认
2. 搜索壁纸 → 选择 → 确认
3. 生成提示词 → 检查中英文输出

- [ ] **Step 4: 测试 Qwen 降级**

断开网络或故意传无效 imageUrl，确认降级逻辑生效，页面显示提示。

- [ ] **Step 5: 提交**

---

## 注意事项

1. **LongCat 兼容 Anthropic SDK**：LongCat API 兼容 Anthropic 格式，可以直接用 `@anthropic-ai/sdk` 调用
2. **ModelScope API 格式**：使用 OpenAI 兼容的 `/v1/chat/completions` 端点，但响应格式可能有差异，需要兼容处理
3. **降级透明**：用户需要知道当前是"图片分析"还是"默认风格模板"，UI 上必须有明确提示
4. **环境变量**：`.env.local` 不提交到 git，只提交 `.env.local.example`
