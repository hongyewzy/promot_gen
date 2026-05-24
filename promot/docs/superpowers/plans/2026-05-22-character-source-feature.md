# 人物来源功能 - Implementation Plan

> **For agentic workers:** REQUIRED SUBKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在人物查询中增加来源选择（游戏/动漫/漫画/小说）+ 来源名称输入；在最终提示词中输出 `【来源名称/人物名】` 格式。

**Architecture:**
- `CharacterInfo` 新增 `sourceType` 和 `sourceName` 字段
- CharacterStep 查询区加来源类型下拉 + 来源名称输入框
- character API 接收来源参数，查询 prompt 中附带来源信息，返回时包含 AI 识别的来源
- prompt API 在生成提示词时使用 `【来源/人物】` 格式
- 如果用户没填来源，AI 自动识别并返回，用户可修改

**Tech Stack:** Next.js 14, TypeScript, LongCat API

---

### Task 1: 更新类型定义

**Files:**
- Modify: `prompt-generator/src/types/index.ts`

- [ ] **Step 1: 给 CharacterInfo 加 sourceType 和 sourceName 字段**

```typescript
export type SourceType = '游戏' | '动漫' | '漫画' | '小说';

export interface CharacterInfo {
  name: string;
  hairColor: string;
  hairstyle: string;
  eyeColor: string;
  skinColor: string;
  clothing: string;
  other: string;
  sourceType?: SourceType;  // 来源类型（可选）
  sourceName?: string;      // 来源名称（可选，如：崩坏星穹铁道）
}

export type Orientation = 'portrait' | 'landscape';

export interface StyleSettings {
  orientation: Orientation;
  pose: string;
  clothing: string;
  background: string;
}

export interface PromptResult {
  chinese: string;
  english: string;
}
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

确认无 TypeScript 错误。

---

### Task 2: 更新 CharacterStep 组件

**Files:**
- Modify: `prompt-generator/src/components/CharacterStep.tsx`

- [ ] **Step 1: 在查询区加来源类型下拉和来源名称输入框**

修改点：
1. import 加 `SourceType`
2. 组件 props 和 state 处理 `sourceType` / `sourceName`
3. 查询按钮上方加来源选择区域
4. handleSearch body 中附带 sourceType/sourceName
5. 确认时传递完整 CharacterInfo

修改后完整内容：

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, ArrowRight, User } from 'lucide-react';
import type { CharacterInfo, SourceType } from '@/types';

interface CharacterStepProps {
  character: CharacterInfo | null;
  onConfirm: (character: CharacterInfo) => void;
}

const sourceOptions: SourceType[] = ['游戏', '动漫', '漫画', '小说'];

const fields: { key: keyof CharacterInfo; label: string; placeholder: string }[] = [
  { key: 'name', label: '姓名', placeholder: '输入人物姓名' },
  { key: 'hairColor', label: '发色', placeholder: '如：黑色、金色、银白色' },
  { key: 'hairstyle', label: '发型', placeholder: '如：双马尾、短发、长发披肩' },
  { key: 'eyeColor', label: '瞳色', placeholder: '如：蓝色、红色、绿色' },
  { key: 'skinColor', label: '肤色', placeholder: '如：白皙、小麦色、古铜色' },
  { key: 'clothing', label: '衣着风格', placeholder: '如：校服、古装、赛博朋克风' },
  { key: 'other', label: '其他特征', placeholder: '如：耳环、伤疤、特殊配饰' },
];

export default function CharacterStep({ character, onConfirm }: CharacterStepProps) {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [sourceName, setSourceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState<CharacterInfo | null>(character);

  const handleSearch = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sourceType: sourceType || undefined,
          sourceName: sourceName.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('查询失败');
      const data = await res.json();
      setEditData(data);
    } catch (e) {
      console.error('Character search error:', e);
      setError('查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleChange = (key: keyof CharacterInfo, value: string) => {
    if (!editData) return;
    setEditData({ ...editData, [key]: value });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          步骤 1：人物查询
        </CardTitle>
        <CardDescription>输入人物姓名和来源，AI 将自动查询外貌特征</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 来源选择 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sourceType">来源类型（可选）</Label>
            <select
              id="sourceType"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType | '')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">自动识别</option>
              {sourceOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sourceName">来源名称（可选）</Label>
            <Input
              id="sourceName"
              placeholder="如：崩坏星穹铁道、火影忍者..."
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
            />
          </div>
        </div>

        {/* 人物名查询 */}
        <div className="flex gap-2">
          <Input
            placeholder="输入人物姓名，如：符玄、鸣人..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading || !name.trim()}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && !editData && (
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}
        {editData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">人物特征</h3>
              <Button variant="ghost" size="sm" onClick={handleSearch} disabled={loading}>
                <RefreshCw className={'w-3 h-3 mr-1 ' + (loading ? 'animate-spin' : '')} />
                重新查询
              </Button>
            </div>
            {/* 显示 AI 识别的来源（如果有） */}
            {(editData.sourceType || editData.sourceName) && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">AI 识别来源</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">来源类型</Label>
                    <select
                      value={editData.sourceType || ''}
                      onChange={(e) => handleChange('sourceType', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">未指定</option>
                      {sourceOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">来源名称</Label>
                    <Input
                      value={editData.sourceName || ''}
                      onChange={(e) => handleChange('sourceName', e.target.value)}
                      placeholder="如：崩坏星穹铁道"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    value={editData[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
            <Button onClick={() => onConfirm(editData)} className="w-full">
              确认并继续
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

确认无 TypeScript 错误。

---

### Task 3: 更新 character API

**Files:**
- Modify: `prompt-generator/src/app/api/character/route.ts`

- [ ] **Step 1: 修改 route.ts，接收来源参数 + 返回 AI 识别的来源**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import type { SourceType } from '@/types';

function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.substring(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const { name, sourceType, sourceName } = await req.json() as {
      name: string;
      sourceType?: SourceType;
      sourceName?: string;
    };

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: '姓名不能为空' }, { status: 400 });
    }

    // 构建查询 prompt
    let sourceHint = '';
    if (sourceType && sourceName) {
      sourceHint = `（来自${sourceType}《${sourceName}》）`;
    } else if (sourceType) {
      sourceHint = `（来自${sourceType}）`;
    } else if (sourceName) {
      sourceHint = `（来自《${sourceName}》）`;
    }

    const message = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `请搜索并描述${sourceHint}人物「${name}」的外貌形象特征。${!sourceType && !sourceName ? '同时请识别该人物最可能的来源类型和来源名称。' : ''}

返回 JSON 格式：
{
  "name": "人物姓名",
  "hairColor": "发色（如：黑色、金色、银白色）",
  "hairstyle": "发型（如：双马尾、短发、长发披肩）",
  "eyeColor": "瞳色（如：蓝色、红色、绿色）",
  "skinColor": "肤色（如：白皙、小麦色、古铜色）",
  "clothing": "衣着风格（如：校服、古装、赛博朋克风）",
  "other": "其他重要特征（如：耳环、伤疤、特殊配饰）"${!sourceType && !sourceName ? ',\n  "sourceType": "来源类型（游戏/动漫/漫画/小说）",\n  "sourceName": "来源名称（如：崩坏星穹铁道）"' : ''}
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

    if (parsed.error) {
      console.error('Character API returned error:', parsed.error);
      return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 });
    }

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
      // 优先用用户传入的来源，否则用 AI 识别的
      sourceType: sourceType || parsed.sourceType || '',
      sourceName: sourceName || parsed.sourceName || '',
    });
  } catch (e) {
    console.error('Character API error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 4: 更新 prompt API 使用来源格式

**Files:**
- Modify: `prompt-generator/src/app/api/prompt/route.ts`

- [ ] **Step 1: 修改 prompt API，在生成提示词时使用【来源/人物】格式**

修改点：
1. 从 character 中取 sourceType/sourceName
2. 构建 `displayName`：有来源时 `【来源名称/人物名】`，无来源时直接 `人物名`
3. 在 prompt 中使用 displayName

修改 `src/app/api/prompt/route.ts` 中构建 userPrompt 的部分：

找到 `let userPrompt = \`请根据以下人物信息生成 AI 生图提示词。` 这一段，替换为：

```typescript
    // 构建带来源的显示名
    const displayName = (character.sourceType && character.sourceName)
      ? `【${character.sourceName}/${character.name}】`
      : character.sourceName
        ? `【${character.sourceName}/${character.name}】`
        : character.name;

    let userPrompt = `请根据以下人物信息生成 AI 生图提示词。

人物信息：
- 姓名：${displayName}
- 发色：${character.hairColor}
- 发型：${character.hairstyle}
- 瞳色：${character.eyeColor}
- 肤色：${character.skinColor}
- 衣着：${character.clothing}
- 其他特征：${character.other}`;

    if (s.pose || s.clothing || s.background) {
      userPrompt += '\n\n风格搭配：';
      if (s.pose) userPrompt += '\n- 姿势：' + s.pose;
      if (s.clothing) userPrompt += '\n- 服饰：' + s.clothing;
      if (s.background) userPrompt += '\n- 背景：' + s.background;
    }

    userPrompt += `

请按以下模板结构生成风格描述：
[核心描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [风格质感] + [光影氛围]

- 核心描述：年龄、身份
- 面部细节：肤色、眼神、瞳色、五官特征
- 发型发色：长度、质感、细节
- 服装配饰：材质、装饰、配饰
- 动作姿势：站姿/坐姿/回眸/俯视/怼脸拍等
- 风格质感：高级CG插画、BJD质感、伪厚涂、8K超清等
- 光影氛围：镜头视角、光线、环境

重要：在描述中请使用「${displayName}」作为人物标识，确保生图工具能准确识别该角色。

参考示例：
"20多岁古代男子，高级CG概念插画，模糊感，高清晰度，额前碎发，背景全黑，黑发全披发，精致五官，冷白皮，戴黑色斗笠围黑纱，黑夜窗边茶桌，冷酷眼神仰拍，歪头侧脸，手拿酒壶，怼脸拍。"

请返回 JSON 格式：
{
  "chinese": "完整的中文描述，将人物特征和风格特征融合成一段流畅的文字",
  "english": "英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar ${aspectRatio} --v 6"
}`;
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 5: 最终验证

**Files:**
- Verify: 全部文件

- [ ] **Step 1: 完整构建**

```powershell
cd 'D:\桌面\promot\prompt-generator'; Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue; npm run build
```

确认零错误。

- [ ] **Step 2: 启动开发服务器验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run dev
```

访问 http://localhost:3000，走完整流程：
1. 选择来源类型（如：游戏）+ 输入来源名称（如：崩坏星穹铁道）
2. 输入人物名（如：符玄）→ 查询 → 确认结果
3. 进入画面设置 → 生成提示词
4. 检查中文描述和英文提示词中是否包含【崩坏星穹铁道/符玄】

也测试不填来源的情况：
1. 直接输入人物名 → 查询
2. 检查 AI 是否自动识别了来源
3. 检查提示词格式是否正确
