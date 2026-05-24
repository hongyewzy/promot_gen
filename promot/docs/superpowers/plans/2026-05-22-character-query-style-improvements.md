# 人物查询精简 + 风格搭配扩充 - Implementation Plan

> **For agentic workers:** REQUIRED SUBKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1) 精简人物查询字段为发色/瞳色/发型/肤色/身高体型/标志性特征，提高准确性；2) 扩充风格搭配为姿势/服饰/背景/画风/光影/色调/构图7个维度，每个维度AI推荐+自由输入。

**Architecture:**
- CharacterInfo 字段精简：去掉 clothing/other，加 bodyType/featuredMark
- character API prompt 重写：强调官方设定准确性，只查6个字段
- CharacterStep 结果展示对应精简
- StyleSettings 扩充：加 artStyle/lighting/tone/composition
- SettingsStep 7个维度输入框 + AI推荐（style API返回7个维度）
- prompt API 使用完整风格参数生成提示词

**Tech Stack:** Next.js 14, TypeScript, LongCat API

---

### Task 1: 更新类型定义

**Files:**
- Modify: `prompt-generator/src/types/index.ts`

- [ ] **Step 1: 精简 CharacterInfo，扩充 StyleSettings**

```typescript
export type SourceType = '游戏' | '动漫' | '漫画' | '小说';

export interface CharacterInfo {
  name: string;
  hairColor: string;      // 发色
  hairstyle: string;      // 发型
  eyeColor: string;       // 瞳色
  skinColor: string;      // 肤色
  bodyType: string;       // 身高体型
  featuredMark: string;   // 标志性特征
  sourceType?: SourceType;
  sourceName?: string;
}

export type Orientation = 'portrait' | 'landscape';

export interface StyleSettings {
  orientation: Orientation;
  pose: string;           // 姿势
  clothing: string;       // 服饰
  background: string;     // 背景
  artStyle: string;       // 画风
  lighting: string;       // 光影
  tone: string;           // 色调
  composition: string;    // 构图
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

---

### Task 2: 更新 character API

**Files:**
- Modify: `prompt-generator/src/app/api/character/route.ts`

- [ ] **Step 1: 重写 character API，精简为6个字段，强调官方设定**

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
        content: `请搜索${sourceHint}人物「${name}」的官方外貌设定，返回最准确的特征描述。${!sourceType && !sourceName ? '同时识别该人物最可能的来源类型和来源名称。' : ''}

重点搜索：发色、瞳色、发型、肤色、身高体型、标志性特征（如伤疤、配饰、特殊标记等）。
必须基于官方设定，不要凭印象猜测。

返回 JSON 格式：
{
  "name": "人物姓名",
  "hairColor": "发色（精确描述，如：银白色渐变、深蓝黑色）",
  "hairstyle": "发型（精确描述，如：齐刘海长直发、双丸子头、短发微卷）",
  "eyeColor": "瞳色（精确描述，如：琥珀色异瞳、深红色）",
  "skinColor": "肤色（如：白皙、小麦色、古铜色）",
  "bodyType": "身高体型（如：165cm苗条、180cm健壮、娇小可爱）",
  "featuredMark": "标志性特征（如：左眼下方泪痣、右手黑色手套、额头闪电疤痕、兽耳、机械臂）"${!sourceType && !sourceName ? ',\n  "sourceType": "来源类型（游戏/动漫/漫画/小说）",\n  "sourceName": "来源名称（如：崩坏星穹铁道）"' : ''}
}
只返回 JSON，不要其他内容。所有值用中文。`,
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Character API: no JSON found:', text.substring(0, 200));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.error) {
      console.error('Character API returned error:', parsed.error);
      return NextResponse.json({ error: '查询失败，请重试' }, { status: 500 });
    }

    if (!parsed.name || typeof parsed.name !== 'string') {
      console.error('Character API: missing name:', JSON.stringify(parsed).substring(0, 200));
      return NextResponse.json({ error: 'AI 返回数据不完整，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      name: parsed.name,
      hairColor: parsed.hairColor || '',
      hairstyle: parsed.hairstyle || '',
      eyeColor: parsed.eyeColor || '',
      skinColor: parsed.skinColor || '',
      bodyType: parsed.bodyType || '',
      featuredMark: parsed.featuredMark || '',
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

### Task 3: 更新 CharacterStep 组件

**Files:**
- Modify: `prompt-generator/src/components/CharacterStep.tsx`

- [ ] **Step 1: 精简 fields 为6个，更新 placeholder**

修改 `fields` 数组（去掉 clothing/other，加 bodyType/featuredMark）：

```typescript
const fields: { key: keyof CharacterInfo; label: string; placeholder: string }[] = [
  { key: 'name', label: '姓名', placeholder: '输入人物姓名' },
  { key: 'hairColor', label: '发色', placeholder: '如：银白色渐变、深蓝黑色...' },
  { key: 'hairstyle', label: '发型', placeholder: '如：齐刘海长直发、双丸子头...' },
  { key: 'eyeColor', label: '瞳色', placeholder: '如：琥珀色异瞳、深红色...' },
  { key: 'skinColor', label: '肤色', placeholder: '如：白皙、小麦色、古铜色...' },
  { key: 'bodyType', label: '身高体型', placeholder: '如：165cm苗条、180cm健壮...' },
  { key: 'featuredMark', label: '标志性特征', placeholder: '如：泪痣、兽耳、机械臂、疤痕...' },
];
```

同时修改 CardDescription 文字：
```tsx
<CardDescription>输入人物姓名和来源，AI 将查询官方外貌设定</CardDescription>
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 4: 更新 style API 返回7个维度

**Files:**
- Modify: `prompt-generator/src/app/api/style/route.ts`

- [ ] **Step: 重写 style API，返回姿势/服饰/背景/画风/光影/色调/构图**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import type { Orientation } from '@/types';

function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.substring(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const { characterName, orientation } = await req.json() as {
      characterName: string;
      orientation?: Orientation;
    };

    if (!characterName) {
      return NextResponse.json({ error: '缺少人物名' }, { status: 400 });
    }

    const orientationText = orientation === 'landscape' ? '横屏（16:9）' : '竖屏（9:16）';

    const posePool = [
      '站立全身', '慵懒坐姿', '回眸微笑', '低头沉思', '战斗姿态', '侧脸仰拍',
      '怼脸特写', '倚靠回眸', '跪坐', '飞翔姿态', '舞蹈动作', '持武器站立',
      '双手叉腰', '托腮凝视', '转身回眸', '拉伸姿态', '魔法师施法姿势',
    ];
    const clothingPool = [
      '精致华服', '简约休闲', '赛博朋克装', '古风汉服', '暗黑哥特', '校园制服',
      '仙女纱裙', '中世纪铠甲', '未来科技装', '洛丽塔', '忍者装', '侠客长袍',
      '宫廷礼服', '运动休闲', '蒸汽朋克', '精灵服饰', '修女服',
    ];
    const backgroundPool = [
      '城市夜景', '森林光影', '室内暖光', '雪夜街道', '海边日落', '星空宇宙',
      '樱花树下', '古堡大厅', '霓虹雨夜', '云端仙境', '废墟荒野', '水下世界',
      '太空站', '魔法学院', '日式庭院', '赛博都市', '极光冰川',
    ];
    const artStylePool = [
      '日系插画', '3D渲染', '厚涂油画', '水彩风', '赛博朋克', '国风工笔画',
      '韩漫风格', '欧美卡通', '像素艺术', '浮世绘', '概念艺术', 'BJD娃娃质感',
    ];
    const lightingPool = [
      '逆光', '丁达尔效应', '霓虹灯光', '自然光', '月光', '烛光',
      '冷色调灯光', '暖色调灯光', '侧光', '顶光', '底光', '混合光',
    ];
    const tonePool = [
      '冷色调', '暖色调', '高饱和', '低饱和', '莫兰迪色', '黑白',
      '复古色调', '胶片感', '清新明亮', '暗黑压抑', '梦幻粉紫', '青橙对比',
    ];
    const compositionPool = [
      '特写', '半身', '全身', '俯视', '仰拍', '侧面',
      '对称构图', '三分法', '中心构图', '留鱼眼透视', '广角全景',
    ];

    const shuffle = <T>(arr: T[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const pick5 = (pool: string[]) => shuffle(pool).slice(0, 5).join('、');

    const userPrompt = `你是 AI 绘画提示词专家。请为人物「${characterName}」推荐一套适合${orientationText}画幅的热门生图风格搭配。

从以下热门选项中各选 1 个最适合该人物的（选最热门、最出片的组合）：

**人物姿势**（选1）：${pick5(posePool)}

**服饰风格**（选1）：${pick5(clothingPool)}

**环境背景**（选1）：${pick5(backgroundPool)}

**画风**（选1）：${pick5(artStylePool)}

**光影**（选1）：${pick5(lightingPool)}

**色调**（选1）：${pick5(tonePool)}

**构图**（选1）：${pick5(compositionPool)}

推荐原则：
- 竖屏（9:16）：优先人物特写感强、姿势有张力的搭配
- 横屏（16:9）：优先场景开阔、背景有层次感的搭配
- 必须结合人物性格特点来选

只返回以下 JSON，不要任何解释或其他内容：
{
  "pose": "选择的姿势",
  "clothing": "选择的服饰",
  "background": "选择的背景",
  "artStyle": "选择的画风",
  "lighting": "选择的光影",
  "tone": "选择的色调",
  "composition": "选择的构图"
}`;

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Style API: no JSON found:', text.substring(0, 200));
      return NextResponse.json({ error: 'AI 返回格式异常' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonStr);
    if (parsed.error) {
      console.error('Style API error:', parsed.error);
      return NextResponse.json({ error: '推荐失败' }, { status: 500 });
    }

    return NextResponse.json({
      pose: parsed.pose || '',
      clothing: parsed.clothing || '',
      background: parsed.background || '',
      artStyle: parsed.artStyle || '',
      lighting: parsed.lighting || '',
      tone: parsed.tone || '',
      composition: parsed.composition || '',
    });
  } catch (e) {
    console.error('Style API error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 5: 更新 SettingsStep 组件

**Files:**
- Modify: `prompt-generator/src/components/SettingsStep.tsx`

- [ ] **Step: 重写 SettingsStep，7个维度输入框 + AI推荐**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Settings, Monitor, Smartphone, RefreshCw, Wand2 } from 'lucide-react';
import type { Orientation, StyleSettings } from '@/types';

interface SettingsStepProps {
  settings: StyleSettings;
  characterName: string;
  onConfirm: (settings: StyleSettings) => void;
  onBack: () => void;
}

const defaultSettings: StyleSettings = {
  orientation: 'portrait',
  pose: '', clothing: '', background: '',
  artStyle: '', lighting: '', tone: '', composition: '',
};

const fieldDefs: { key: keyof StyleSettings; label: string; placeholder: string }[] = [
  { key: 'pose', label: '人物姿势', placeholder: '如：回眸微笑、慵懒坐姿、战斗姿态...' },
  { key: 'clothing', label: '服饰风格', placeholder: '如：黑色蕾丝长裙、赛博朋克机甲...' },
  { key: 'background', label: '环境背景', placeholder: '如：霓虹雨夜、樱花树下、星空云海...' },
  { key: 'artStyle', label: '画风', placeholder: '如：日系插画、3D渲染、厚涂油画...' },
  { key: 'lighting', label: '光影', placeholder: '如：逆光、丁达尔效应、霓虹灯光...' },
  { key: 'tone', label: '色调', placeholder: '如：冷色调、暖色调、高饱和、莫兰迪色...' },
  { key: 'composition', label: '构图', placeholder: '如：特写、全身、俯视、仰拍...' },
];

export default function SettingsStep({ settings: initial, characterName, onConfirm, onBack }: SettingsStepProps) {
  const [orientation, setOrientation] = useState<Orientation>(initial.orientation);
  const [values, setValues] = useState<Omit<StyleSettings, 'orientation'>>({
    pose: initial.pose,
    clothing: initial.clothing,
    background: initial.background,
    artStyle: initial.artStyle,
    lighting: initial.lighting,
    tone: initial.tone,
    composition: initial.composition,
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAutoGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName, orientation }),
      });
      if (!res.ok) throw new Error('推荐失败');
      const data = await res.json();
      setValues({
        pose: data.pose || '',
        clothing: data.clothing || '',
        background: data.background || '',
        artStyle: data.artStyle || '',
        lighting: data.lighting || '',
        tone: data.tone || '',
        composition: data.composition || '',
      });
    } catch (e) {
      console.error('Auto generate style error:', e);
      setError('AI 推荐失败，请手动输入或重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleChange = (key: keyof Omit<StyleSettings, 'orientation'>, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          步骤 2：画面设置
        </CardTitle>
        <CardDescription>选择画幅方向，AI 自动推荐热门风格搭配</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 横屏/竖屏 */}
        <div className="space-y-3">
          <Label>画幅方向</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setOrientation('portrait')}
              className={
                'flex flex-col items-center gap-3 p-5 rounded-lg border-2 transition-all ' +
                (orientation === 'portrait'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50')
              }
            >
              <Smartphone className={'w-10 h-10 ' + (orientation === 'portrait' ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="font-medium">竖屏 9:16</p>
                <p className="text-xs text-muted-foreground mt-1">适合手机壁纸</p>
              </div>
              {orientation === 'portrait' && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={
                'flex flex-col items-center gap-3 p-5 rounded-lg border-2 transition-all ' +
                (orientation === 'landscape'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50')
              }
            >
              <Monitor className={'w-10 h-10 ' + (orientation === 'landscape' ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="font-medium">横屏 16:9</p>
                <p className="text-xs text-muted-foreground mt-1">适合电脑壁纸</p>
              </div>
              {orientation === 'landscape' && (
                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* AI 推荐按钮 */}
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">风格搭配</Label>
          <Button variant="default" size="sm" onClick={handleAutoGenerate} disabled={generating}>
            {generating ? <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1.5" />}
            {generating ? '生成中...' : 'AI 热门推荐'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* loading 骨架 */}
        {generating && (
          <div className="space-y-3">
            {fieldDefs.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* 7个维度输入框 */}
        {!generating && (
          <div className="space-y-4">
            {fieldDefs.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  value={values[f.key as keyof typeof values]}
                  onChange={(e) => handleChange(f.key as keyof typeof values, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        )}

        {/* 搭配预览 */}
        {Object.values(values).some(v => v) && !generating && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">当前搭配预览</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {values.pose && <span>姿势：{values.pose}</span>}
              {values.clothing && <span>服饰：{values.clothing}</span>}
              {values.background && <span>背景：{values.background}</span>}
              {values.artStyle && <span>画风：{values.artStyle}</span>}
              {values.lighting && <span>光影：{values.lighting}</span>}
              {values.tone && <span>色调：{values.tone}</span>}
              {values.composition && <span>构图：{values.composition}</span>}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> 上一步
        </Button>
        <Button onClick={() => onConfirm({ orientation, ...values })} className="flex-1">
          确认并继续 <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 6: 更新 prompt API 使用完整风格参数

**Files:**
- Modify: `src/app/api/prompt/route.ts`

- [ ] **Step: 在 userPrompt 中使用7个风格参数**

在 prompt API 中，将风格搭配部分改为：

```typescript
    if (s.pose || s.clothing || s.background || s.artStyle || s.lighting || s.tone || s.composition) {
      userPrompt += '\n\n风格搭配：';
      if (s.pose) userPrompt += '\n- 姿势：' + s.pose;
      if (s.clothing) userPrompt += '\n- 服饰：' + s.clothing;
      if (s.background) userPrompt += '\n- 背景：' + s.background;
      if (s.artStyle) userPrompt += '\n- 画风：' + s.artStyle;
      if (s.lighting) userPrompt += '\n- 光影：' + s.lighting;
      if (s.tone) userPrompt += '\n- 色调：' + s.tone;
      if (s.composition) userPrompt += '\n- 构图：' + s.composition;
    }
```

同时在"重要"提示中也加上风格参考：

```
重要：在描述中请使用「${displayName}」作为人物标识，并结合以上风格搭配生成高质量提示词。
```

- [ ] **Step 2: 构建验证**

```powershell
cd 'D:\桌面\promot\prompt-generator'; npm run build
```

---

### Task 7: 最终验证

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
1. 输入人物名 → 查询 → 确认6个字段结果
2. 选择画幅 → AI热门推荐 → 检查7个维度都有值 → 可自由修改
3. 生成提示词 → 检查中英文输出包含来源格式和风格参数
