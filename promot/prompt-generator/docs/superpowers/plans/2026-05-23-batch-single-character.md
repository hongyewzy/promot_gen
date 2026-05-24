# 批量单人生成 + 风格升级 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-step. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将多人物同框模式改为批量单人生成（每人一份提示词，风格共用），人物输入改为单文本框逗号分隔，去掉色调维度，全面升级风格选项质量至专业水准。

**Architecture:** CharacterStep 重做单文本框输入+批量查询；新建 TagSelector 组件；SettingsStep 升级为标签选择器 UI，选项池全面升级为短语级专业描述，移除色调，场景背景做两级选择；PromptStep 改为批量生成每人一份提示词（每人单独调 /api/prompt）；/style 和 /api/prompt 适配新选项池；类型定义移除 tone 和多人同框相关概念。

**Tech Stack:** Next.js 14 App Router, TypeScript, shadcn/ui, TailwindCSS, LongCat API

---

### Task 1: 更新类型定义 — 移除 tone、GroupMode、CharacterGroup

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 完整替换 `src/types/index.ts`**

```typescript
export type SourceType = '游戏' | '动漫' | '漫画' | '小说';

export interface CharacterInfo {
  name: string;
  hairColor: string;
  hairstyle: string;
  eyeColor: string;
  skinColor: string;
  bodyType: string;
  featuredMark: string;
  sourceType?: SourceType;
  sourceName?: string;
}

export type Orientation = 'portrait' | 'landscape';

export interface PoseDetail {
  body: string;
  expression: string;
  camera: string;
}

export interface ClothingDetail {
  top: string;
  bottom: string;
  shoes: string;
  accessory: string;
}

export interface StyleSettings {
  orientation: Orientation;
  pose: PoseDetail;
  clothing: ClothingDetail;
  background: string;
  artStyle: string;
  lighting: string;
  composition: string;
}

export interface PromptResult {
  chinese: string;
  english: string;
}

export const defaultPose = (): PoseDetail => ({
  body: '',
  expression: '',
  camera: '',
});

export const defaultClothing = (): ClothingDetail => ({
  top: '',
  bottom: '',
  shoes: '',
  accessory: '',
});

export const defaultSettings = (orientation: Orientation = 'portrait'): StyleSettings => ({
  orientation,
  pose: defaultPose(),
  clothing: defaultClothing(),
  background: '',
  artStyle: '',
  lighting: '',
  composition: '',
});
```

- [ ] **Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat(types): 移除 tone/GroupMode/CharacterGroup，精简为批量单人生成"
```

---

### Task 2: 创建 TagSelector 标签选择器组件

**Files:**
- Create: `src/components/TagSelector.tsx`

- [ ] **Step 1: 创建文件**

```tsx
'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface TagSelectorProps {
  label: string;
  tags: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function TagSelector({ label, tags, value, onChange }: TagSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(selected ? '' : tag)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-all',
                selected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-muted bg-background hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/TagSelector.tsx
git commit -m "feat(tag-selector): 创建标签选择器组件"
```

---

### Task 3: 重做 CharacterStep — 单文本框 + 批量查询

**Files:**
- Modify: `src/components/CharacterStep.tsx`

Props 变更：
- 移除 `mode`, `interactions`, `onModeChange`, `onInteractionsChange`
- 新增 `sourceType: SourceType | ''`, `sourceName: string`, `onSourceTypeChange`, `onSourceNameChange`
- `onConfirm(characters, sourceType, sourceName)` — 3 个参数

UI 变更：
- 移除：模式切换按钮、折叠卡片列表、添加人物按钮、互动描述输入
- 新增：来源类型/名称（共用，放在顶部）、单文本框输入逗号分隔人名、批量查询按钮
- 查询结果以简洁列表展示（非折叠卡片），每个人物直接展开 6 个字段

- [ ] **Step 1: 完整替换 `src/components/CharacterStep.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, RefreshCw, ArrowRight, User } from 'lucide-react';
import type { CharacterInfo, SourceType } from '@/types';

interface CharacterStepProps {
  characters: CharacterInfo[];
  sourceType: SourceType | '';
  sourceName: string;
  onConfirm: (characters: CharacterInfo[], sourceType: SourceType | '', sourceName: string) => void;
  onSourceTypeChange: (t: SourceType | '') => void;
  onSourceNameChange: (v: string) => void;
}

const sourceOptions: SourceType[] = ['游戏', '动漫', '漫画', '小说'];

const fields: { key: keyof CharacterInfo; label: string; placeholder: string }[] = [
  { key: 'hairColor', label: '发色', placeholder: '如：银白色渐变、深蓝黑色...' },
  { key: 'hairstyle', label: '发型', placeholder: '如：齐刘海长直发、双丸子头...' },
  { key: 'eyeColor', label: '瞳色', placeholder: '如：琥珀色异瞳、深红色...' },
  { key: 'skinColor', label: '肤色', placeholder: '如：白皙、小麦色、古铜色...' },
  { key: 'bodyType', label: '身高体型', placeholder: '如：165cm苗条、180cm健壮...' },
  { key: 'featuredMark', label: '标志性特征', placeholder: '如：泪痣、兽耳、机械臂、疤痕...' },
];

export default function CharacterStep({
  characters: initialCharacters,
  sourceType: initialSourceType,
  sourceName: initialSourceName,
  onConfirm,
  onSourceTypeChange,
  onSourceNameChange,
}: CharacterStepProps) {
  const [namesInput, setNamesInput] = useState(
    initialCharacters.map((c) => c.name).filter(Boolean).join(', ')
  );
  const [sourceType, setSourceType] = useState<SourceType | ''>(initialSourceType);
  const [sourceName, setSourceName] = useState(initialSourceName);
  const [characters, setCharacters] = useState<CharacterInfo[]>(initialCharacters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSourceTypeChange = (t: SourceType | '') => {
    setSourceType(t);
    onSourceTypeChange(t);
  };

  const handleSourceNameChange = (v: string) => {
    setSourceName(v);
    onSourceNameChange(v);
  };

  const parseNames = (input: string): string[] =>
    input.split(',').map((n) => n.trim()).filter(Boolean);

  const handleBatchSearch = async () => {
    const names = parseNames(namesInput);
    if (names.length === 0) return;

    setLoading(true);
    setError('');

    const newChars: CharacterInfo[] = names.map((name) => ({
      name, hairColor: '', hairstyle: '', eyeColor: '', skinColor: '', bodyType: '', featuredMark: '',
      sourceType: sourceType || undefined,
      sourceName: sourceName || undefined,
    }));
    setCharacters(newChars);

    for (let i = 0; i < names.length; i++) {
      try {
        const res = await fetch('/api/character', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: names[i],
            sourceType: sourceType || undefined,
            sourceName: sourceName?.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data: CharacterInfo = await res.json();
          newChars[i] = { ...data, name: data.name || names[i] };
          setCharacters([...newChars]);
        }
      } catch { /* skip */ }
    }

    setLoading(false);
  };

  const handleFieldChange = (idx: number, key: keyof CharacterInfo, value: string) => {
    const updated = [...characters];
    updated[idx] = { ...updated[idx], [key]: value };
    setCharacters(updated);
  };

  const validCount = characters.filter((c) => c.name.trim() && c.hairColor).length;
  const namesCount = parseNames(namesInput).length;
  const canSubmit = namesCount > 0 && validCount === namesCount;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          步骤 1：人物查询
        </CardTitle>
        <CardDescription>输入人物姓名（英文逗号分隔），AI 将批量查询外貌特征</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sourceType">来源类型（可选）</Label>
            <select
              id="sourceType"
              value={sourceType}
              onChange={(e) => handleSourceTypeChange(e.target.value as SourceType | '')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              onChange={(e) => handleSourceNameChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="names">人物姓名</Label>
          <div className="flex gap-2">
            <Input
              id="names"
              placeholder="如：Keqing, Ganyu, Shenhe"
              value={namesInput}
              onChange={(e) => setNamesInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBatchSearch} disabled={loading || !namesInput.trim()}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? '查询中...' : '批量查询'}
            </Button>
          </div>
          {namesCount > 0 && (
            <p className="text-xs text-muted-foreground">
              将查询 {namesCount} 个人物：{parseNames(namesInput).join('、')}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {characters.length > 0 && (
          <div className="space-y-3">
            {characters.map((char, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                  <span className="font-medium">{char.name}</span>
                  {char.hairColor && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {char.hairColor} · {char.eyeColor}
                    </span>
                  )}
                  {!char.hairColor && loading && (
                    <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
                  )}
                </div>
                {char.hairColor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <Label htmlFor={`${f.key}-${idx}`} className="text-xs">{f.label}</Label>
                        <Input
                          id={`${f.key}-${idx}`}
                          value={char[f.key] as string}
                          onChange={(e) => handleFieldChange(idx, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => onConfirm(characters, sourceType, sourceName)}
          className="w-full"
          disabled={!canSubmit}
        >
          确认 {validCount > 0 ? `${validCount} 个人物` : ''} 并继续
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/CharacterStep.tsx
git commit -m "feat(character): 重做人物输入为单文本框+批量查询"
```

---

### Task 4: 升级 SettingsStep — 标签选择器 + 选项池升级 + 移除色调

**Files:**
- Modify: `src/components/SettingsStep.tsx`

变更要点：
1. 移除 `tone` 相关的所有状态、UI、API 调用
2. 所有维度从 `<Input>` 文本输入改为 `<TagSelector>` 标签选择
3. 选项池全面升级为短语级专业描述
4. 场景背景做两级选择：先选大类（城市街拍/自然风光/室内空间/幻想世界），再选具体场景
5. 服饰改为 2×2 网格布局的标签选择器
6. 移除 tone 相关的 loading 骨架和搭配预览

- [ ] **Step 1: 完整替换 `src/components/SettingsStep.tsx`**

代码较长，按以下结构完整写入文件：

**文件头（导入 + 常量）：**
- 导入 TagSelector（from '@/components/TagSelector'）
- 定义所有选项常量（全部为短语级描述）：
  - BODY_OPTIONS: 8 项，如 '正面全身站立，双手自然下垂'
  - EXPRESSION_OPTIONS: 8 项，如 '淡然微笑，嘴角微微上扬'
  - CAMERA_OPTIONS: 8 项，如 '正面平视，标准半身中景'
  - TOP_OPTIONS: 8 项，如 '白色交领上衣，轻薄透气'
  - BOTTOM_OPTIONS: 8 项，如 '百褶裙，裙摆飘逸'
  - SHOES_OPTIONS: 8 项，如 '木屐，日式传统'
  - ACCESSORY_OPTIONS: 8 项，如 '腰间红色丝带，随风飘动'
  - BACKGROUND_CATEGORIES: 4 大类 × 每类 8 个场景短语
    - 城市街拍：雨夜霓虹街头/黄昏天台/夏日午后林荫道/高空俯瞰都市/地铁站台/樱花街道/赛博朋克暗巷/老旧胡同
    - 自然风光：晨雾针叶林/海边悬崖/星空草原/秋日枫林/雪后白桦林/山巅云海/湖泊倒影/暴风雨前
    - 室内空间：书房百叶窗/咖啡厅/哥特教堂/日式榻榻米/极简客厅/老旧图书馆/宫殿大厅/昏暗酒吧
    - 幻想世界：浮空岛屿/水晶洞穴/天空之城/深海宫殿/魔法学院/废墟遗迹/极光冰原/虚空之境
  - ART_STYLE_OPTIONS: 12 项
  - LIGHTING_OPTIONS: 10 项
  - COMPOSITION_OPTIONS: 8 项
- 定义 BG_CAT_LABELS = BACKGROUND_CATEGORIES.map(c => c.label)

**组件状态：**
- 移除 tone，其余不变
- 新增 bgCategory: string（场景背景大类选择）

**handleAutoGenerate：** 移除 tone 相关赋值

**UI 结构（完整 return）：**
```
<Card>
  <CardHeader>（不变）
  <CardContent className="space-y-6">
    {/* 1. 画幅方向 — 不变 */}
    <div className="space-y-3">
      <Label>画幅方向</Label>
      <div className="grid grid-cols-2 gap-4">
        <button>竖屏 9:16</button>
        <button>横屏 16:9</button>
      </div>
    </div>

    {/* 2. AI 推荐 — 不变 */}
    <div className="flex items-center justify-between">
      <Label>风格搭配</Label>
      <Button>AI 热门推荐</Button>
    </div>
    {error && <p>{error}</p>}

    {/* 3. loading 骨架 — 移除 tone，保留其他 8 个维度 */}
    {generating && <div className="space-y-3">
      {['身体姿态','表情','镜头角度','上装','下装','鞋子','配饰','场景背景','画风','光影','构图'].map(n => (
        <div key={n}><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
      ))}
    </div>}

    {/* 4. 标签选择器区域 */}
    {!generating && <div className="space-y-5">
      {/* 姿势 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">姿势</h4>
        <TagSelector label="身体姿态" tags={BODY_OPTIONS} value={pose.body} onChange={v => setPose(p => ({...p, body: v}))} />
        <TagSelector label="表情" tags={EXPRESSION_OPTIONS} value={pose.expression} onChange={v => setPose(p => ({...p, expression: v}))} />
        <TagSelector label="镜头角度" tags={CAMERA_OPTIONS} value={pose.camera} onChange={v => setPose(p => ({...p, camera: v}))} />
      </div>

      {/* 服饰 — 2×2 网格 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">服饰</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TagSelector label="上装" tags={TOP_OPTIONS} value={clothing.top} onChange={v => setClothing(c => ({...c, top: v}))} />
          <TagSelector label="下装" tags={BOTTOM_OPTIONS} value={clothing.bottom} onChange={v => setClothing(c => ({...c, bottom: v}))} />
          <TagSelector label="鞋子" tags={SHOES_OPTIONS} value={clothing.shoes} onChange={v => setClothing(c => ({...c, shoes: v}))} />
          <TagSelector label="配饰" tags={ACCESSORY_OPTIONS} value={clothing.accessory} onChange={v => setClothing(c => ({...c, accessory: v}))} />
        </div>
      </div>

      {/* 场景背景 — 两级 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">场景背景</h4>
        <div className="flex flex-wrap gap-2">
          {BG_CAT_LABELS.map(cat => (
            <button key={cat} type="button"
              onClick={() => { setBgCategory(bgCategory === cat ? '' : cat); }}
              className={cn('px-3 py-1.5 text-sm rounded-full border transition-all',
                bgCategory === cat ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-muted bg-background hover:border-primary/50'
              )}>{cat}</button>
          ))}
        </div>
        {bgCategory && (
          <TagSelector label="具体场景" tags={BACKGROUND_CATEGORIES.find(c => c.label === bgCategory)?.options ?? []} value={background} onChange={setBackground} />
        )}
      </div>

      {/* 画风 */}
      <TagSelector label="画风" tags={ART_STYLE_OPTIONS} value={artStyle} onChange={setArtStyle} />

      {/* 光影 */}
      <TagSelector label="光影" tags={LIGHTING_OPTIONS} value={lighting} onChange={setLighting} />

      {/* 构图 */}
      <TagSelector label="构图" tags={COMPOSITION_OPTIONS} value={composition} onChange={setComposition} />
    </div>}

    {/* 5. 搭配预览 — 移除 tone */}
    {!generating && <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">当前搭配预览</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {pose.body && <span>姿态：{pose.body}</span>}
        {pose.expression && <span>表情：{pose.expression}</span>}
        {pose.camera && <span>镜头：{pose.camera}</span>}
        {clothing.top && <span>上装：{clothing.top}</span>}
        {clothing.bottom && <span>下装：{clothing.bottom}</span>}
        {clothing.shoes && <span>鞋子：{clothing.shoes}</span>}
        {clothing.accessory && <span>配饰：{clothing.accessory}</span>}
        {background && <span>背景：{background}</span>}
        {artStyle && <span>画风：{artStyle}</span>}
        {lighting && <span>光影：{lighting}</span>}
        {composition && <span>构图：{composition}</span>}
      </div>
    </div>}
  </CardContent>
  <CardFooter className="flex gap-2">
    <Button variant="outline" onClick={onBack}>上一步</Button>
    <Button onClick={() => onConfirm({ orientation, pose, clothing, background, artStyle, lighting, composition })}>确认并继续</Button>
  </CardFooter>
</Card>
```

注意：需要在 SettingsStep 顶部添加 `import { cn } from '@/utils/lib'` 用于背景大类按钮的样式。

- [ ] **Step 2: 提交**

```bash
git add src/components/SettingsStep.tsx
git commit -m "feat(settings): 升级为标签选择器UI，选项池全面升级，移除色调"
```

---

### Task 5: 更新 /api/style — 适配新选项池

**Files:**
- Modify: `src/app/api/style/route.ts`

变更要点：
1. 移除 tonePool 和 tone 相关逻辑
2. 所有选项池升级为短语级描述（与 SettingsStep 保持一致）
3. AI prompt 中的选项列表同步更新
4. 返回值移除 tone 字段

- [ ] **Step 1: 更新选项池和 prompt**

将 route.ts 中的选项池常量替换为与 SettingsStep 相同的短语级描述（BODY_OPTIONS 等），移除 tonePool。

AI prompt 中的对应部分同步更新，例如：
- `**身体姿态**（选1）：${pick5(bodyPool)}` — bodyPool 内容已升级
- 移除 `**色调**（选1）：${pick5(tonePool)}` 整行

返回值移除 `tone`：
```typescript
return NextResponse.json({
  pose: parsed.pose || { body: '', expression: '', camera: '' },
  clothing: parsed.clothing || { top: '', bottom: '', shoes: '', accessory: '' },
  background: parsed.background || '',
  artStyle: parsed.artStyle || '',
  lighting: parsed.lighting || '',
  composition: parsed.composition || '',
});
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/style/route.ts
git commit -m "feat(api/style): 选项池升级为短语级描述，移除色调"
```

---

### Task 6: 更新 /api/prompt — 移除 tone + 升级 prompt 质量

**Files:**
- Modify: `src/app/api/prompt/route.ts`

变更要点：
1. 移除 `GroupMode` 导入和 `mode`/`interactions` 参数
2. 移除 `isGroup` 判断和多人同框相关逻辑
3. 移除 `s.tone` 的 styleParts 拼接
4. 升级 AI prompt 指令，参考黄金公式：主体描述 + 环境背景 + 风格媒介 + 光线色彩 + 构图视角 + 画质参数
5. max_tokens 保持 3072

- [ ] **Step 1: 修改请求处理**

```typescript
const { characters, settings, feedback } = await req.json() as {
  characters: CharacterInfo[];
  settings?: StyleSettings;
  feedback?: string;
};
```

- [ ] **Step 2: 修改提示词构建**

移除 isGroup 判断，改为始终单人模式。styleParts 中移除 tone：

```typescript
const styleParts: string[] = [];
if (s.pose.body) styleParts.push(`身体姿态：${s.pose.body}`);
if (s.pose.expression) styleParts.push(`表情：${s.pose.expression}`);
if (s.pose.camera) styleParts.push(`镜头角度：${s.pose.camera}`);
if (s.clothing.top) styleParts.push(`上装：${s.clothing.top}`);
if (s.clothing.bottom) styleParts.push(`下装：${s.clothing.bottom}`);
if (s.clothing.shoes) styleParts.push(`鞋子：${s.clothing.shoes}`);
if (s.clothing.accessory) styleParts.push(`配饰：${s.clothing.accessory}`);
if (s.background) styleParts.push(`背景：${s.background}`);
if (s.artStyle) styleParts.push(`画风：${s.artStyle}`);
if (s.lighting) styleParts.push(`光影：${s.lighting}`);
if (s.composition) styleParts.push(`构图：${s.composition}`);
```

升级 AI prompt 指令，参考专业提示词黄金公式：

```typescript
userPrompt += `

请按照专业 AI 生图提示词公式生成：
[主体描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [环境背景] + [风格质感] + [光影氛围] + [构图视角] + [画质参数]

要求：
- 主体描述：结合人物外貌特征，描述年龄、身份、气质
- 面部细节：肤色、眼神、瞳色、五官特征，要求具体（如"冷白皮""琥珀色瞳孔"）
- 发型发色：长度、质感、细节（如"银白色渐变长发，发尾微卷"）
- 服装配饰：材质、装饰、层次感
- 动作姿势：结合所选身体姿态和表情，描述自然生动的动作
- 环境背景：结合所选场景，描述时间、天气、氛围
- 风格质感：结合所选画风，使用专业术语（如"赛璐璐平涂""日系厚涂""虚幻引擎5渲染"）
- 光影氛围：结合所选光影，描述光线方向、强度、色彩
- 构图视角：结合所选构图，描述景别和角度
- 画质参数：8K超清、电影级画质、杰作

重要：在描述中请使用「${characters.map((c) => c.name).join('、')}」作为人物标识，确保生图工具能准确识别该角色。

参考风格：二次元动漫插画、日系游戏CG质感、赛璐璐平涂、精致五官、冷白皮、8K超清细节。

请返回 JSON 格式：
{
  "chinese": "完整的中文描述，将人物特征和风格特征融合成一段流畅的文字",
  "english": "英文提示词，适合 Midjourney/Stable Diffusion，包含关键词和参数如 --ar ${aspectRatio} --v 6"
}`;
```

- [ ] **Step 3: 提交**

```bash
git add src/app/api/prompt/route.ts
git commit -m "feat(api/prompt): 移除多人同框逻辑，升级提示词质量至专业水准"
```

---

### Task 7: 更新 PromptStep — 批量单人生成

**Files:**
- Modify: `src/components/PromptStep.tsx`

变更要点：
1. Props 变更：移除 `mode`、`interactions`，新增 `characters: CharacterInfo[]`（已有）
2. 生成逻辑：从生成 1 份 → 遍历 characters，每人单独调一次 `/api/prompt`
3. 结果展示：从单组 → 列表展示，每份标注人物名，可单独复制
4. 人物信息展示区：展示所有人物（已有，但移除 mode/interactions 相关）
5. 画面设置展示区：移除 tone 显示

- [ ] **Step 1: 修改 Props 和状态**

```typescript
interface PromptStepProps {
  characters: CharacterInfo[];
  settings: StyleSettings;
  promptResult: PromptResult | null;
  onBack: () => void;
  onReset: () => void;
}
```

新增状态：
```typescript
const [results, setResults] = useState<Map<number, PromptResult>>(new Map());
const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
```

- [ ] **Step 2: 修改生成逻辑**

```typescript
const generateAll = async () => {
  setLoadingIdx(-1); // -1 表示批量生成中
  setError('');
  const newResults = new Map<number, PromptResult>();

  for (let i = 0; i < characters.length; i++) {
    setLoadingIdx(i);
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: [characters[i]], // 单人
          settings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        newResults.set(i, data);
        setResults(new Map(newResults));
      }
    } catch { /* skip individual errors */ }
  }

  setLoadingIdx(null);
};
```

- [ ] **Step 3: 修改结果展示**

将结果区从单组改为列表：

```tsx
{results.size > 0 && (
  <div className="space-y-6">
    {characters.map((char, idx) => {
      const result = results.get(idx);
      return (
        <div key={idx} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
            <span className="font-medium">{char.name}</span>
            {!result && loadingIdx === idx && (
              <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>
          {result && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">中文描述</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.chinese, `chinese-${idx}`)}>
                    {copiedField === `chinese-${idx}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedField === `chinese-${idx}` ? '已复制' : '复制'}
                  </Button>
                </div>
                <Textarea value={result.chinese} readOnly className="min-h-[80px] resize-none bg-muted/30" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">英文提示词（Midjourney）</h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.english, `english-${idx}`)}>
                    {copiedField === `english-${idx}` ? <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedField === `english-${idx}` ? '已复制' : '复制'}
                  </Button>
                </div>
                <Textarea value={result.english} readOnly className="min-h-[80px] resize-none bg-muted/30 font-mono text-sm" />
              </div>
            </>
          )}
        </div>
      );
    })}
  </div>
)}
```

- [ ] **Step 4: 修改画面设置展示区**

移除 tone 显示，其余不变：
```tsx
{settings.lighting && <p><span className="text-muted-foreground">光影：</span>{settings.lighting}</p>}
{settings.composition && <p><span className="text-muted-foreground">构图：</span>{settings.composition}</p>}
```

- [ ] **Step 5: 提交**

```bash
git add src/components/PromptStep.tsx
git commit -m "feat(prompt): 改为批量单人生成，每人一份提示词"
```

---

### Task 8: 更新 page.tsx — 适配新 Props

**Files:**
- Modify: `src/app/page.tsx`

变更要点：
1. 移除 `mode`、`interactions` 状态
2. 新增 `sourceType`、`sourceName` 状态
3. CharacterStep props 更新
4. PromptStep props 更新（移除 mode/interactions）

- [ ] **Step 1: 修改 page.tsx**

```tsx
'use client';

import { useState } from 'react';
import StepIndicator from '@/components/StepIndicator';
import CharacterStep from '@/components/CharacterStep';
import SettingsStep from '@/components/SettingsStep';
import PromptStep from '@/components/PromptStep';
import type { CharacterInfo, StyleSettings, Orientation, PromptResult, SourceType } from '@/types';
import { defaultSettings } from '@/types';

const STEPS = ['人物查询', '画面设置', '生成提示词'];

export default function Home() {
  const [step, setStep] = useState(1);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [sourceName, setSourceName] = useState('');
  const [settings, setSettings] = useState<StyleSettings>(defaultSettings());
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);

  const handleCharacterConfirm = (chars: CharacterInfo[], st: SourceType | '', sn: string) => {
    setCharacters(chars);
    setSourceType(st);
    setSourceName(sn);
    setPromptResult(null);
    setStep(2);
  };

  const handleSettingsConfirm = (s: StyleSettings) => {
    setSettings(s);
    setPromptResult(null);
    setStep(3);
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  const handleReset = () => {
    setStep(1);
    setCharacters([]);
    setSourceType('');
    setSourceName('');
    setSettings(defaultSettings());
    setPromptResult(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AI 生图提示词生成器
          </h1>
          <p className="text-muted-foreground mt-2">
            输入人物，AI 自动查询形象特征，生成双语生图提示词
          </p>
        </div>
        <StepIndicator currentStep={step} steps={STEPS} />
        <div className="mt-8">
          {step === 1 && (
            <CharacterStep
              characters={characters}
              sourceType={sourceType}
              sourceName={sourceName}
              onConfirm={handleCharacterConfirm}
              onSourceTypeChange={setSourceType}
              onSourceNameChange={setSourceName}
            />
          )}
          {step === 2 && characters.length > 0 && (
            <SettingsStep
              settings={settings}
              characterNames={characters.map((c) => c.name)}
              onConfirm={handleSettingsConfirm}
              onBack={handleBack}
            />
          )}
          {step === 3 && characters.length > 0 && (
            <PromptStep
              characters={characters}
              settings={settings}
              promptResult={promptResult}
              onBack={handleBack}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/page.tsx
git commit -m "feat(page): 适配新 CharacterStep/PromptStep props，移除 mode/interactions"
```

---

### Task 9: 验证构建

- [ ] **Step 1: TypeScript 编译检查**

```bash
cd prompt-generator && npx tsc --noEmit
```
Expected: 无错误

- [ ] **Step 2: 生产构建**

```bash
cd prompt-generator && npm run build
```
Expected: ✓ Compiled successfully

- [ ] **Step 3: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: 修复构建错误"
```

---

## 变更文件汇总

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/types/index.ts` | 修改 | 移除 tone、GroupMode、CharacterGroup |
| `src/components/TagSelector.tsx` | 新建 | 标签选择器组件 |
| `src/components/CharacterStep.tsx` | 重做 | 单文本框+批量查询 |
| `src/components/SettingsStep.tsx` | 重做 | 标签选择器UI+选项池升级 |
| `src/components/PromptStep.tsx` | 修改 | 批量单人生成 |
| `src/app/api/style/route.ts` | 修改 | 选项池升级+移除tone |
| `src/app/api/prompt/route.ts` | 修改 | 移除多人逻辑+升级prompt质量 |
| `src/app/page.tsx` | 修改 | 适配新Props |
