# 热门选项动态获取功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 SettingsStep 和 style API 中写死的姿势、表情、服装、配饰、背景选项，改为每次从 AI 实时搜索获取热门选项，1 小时缓存。

**Architecture:**
- 新增 `src/app/api/hot-options/route.ts`，调用 LongCat 搜索热门二次元 AI 生图选项，内存缓存 1 小时
- 修改 `SettingsStep.tsx`，加载时调用 API 获取热门选项
- 修改 `style/route.ts`，AI 推荐时调用 hot-options API 获取最新选项池
- 画风、光影、构图保持写死不变

**Tech Stack:** Next.js 14, TypeScript, LongCat API, 内存缓存

---

### Task 1: 创建 /api/hot-options 后端 API

**Files:**
- Create: `src/app/api/hot-options/route.ts`

- [ ] **Step 1: 创建 `src/app/api/hot-options/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';

// 内存缓存
let cache: { data: Record<string, string[]>; expires: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

// 写死兜底选项
const FALLBACK: Record<string, string[]> = {
  body: ['正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲', '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然', '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧'],
  expression: ['淡然微笑，嘴角微微上扬', '冷酷面无表情，眼神锐利', '温柔含笑，眼神柔和', '微微惊讶，眼眸睁大', '害羞低头，面带红晕', '傲娇嘟嘴，脸颊微鼓', '忧郁沉思，目光看向下方', '妩媚撩发，嘴角带笑'],
  camera: ['正面平视，标准半身中景', '低角度仰拍，突出人物高大', '高角度俯拍，显娇小可爱', '侧面45度，轮廓分明', '怼脸特写，面部占满画面', '广角全景，人物与场景融合', '背影镜头，营造神秘感', '鱼眼透视，夸张戏剧效果'],
  top: ['白色交领上衣，轻薄透气', '黑色皮质夹克，金属拉链', '露肩蕾丝衫，精致花边', '学院风西装外套，挺括有型', '和服振袖，华丽纹样', '哥特风衬衫，暗色系', '运动背心，简约贴身', '针织毛衣，柔软温暖'],
  bottom: ['百褶裙，裙摆飘逸', '黑色修身长裤', '热短裤，青春活力', '和服袴，传统优雅', '哥特风长裙，层叠裙摆', '牛仔长裤，休闲随性', '荷叶边短裙，甜美可爱', '灯笼裤，宽松舒适'],
  shoes: ['木屐，日式传统', '长筒靴，帅气干练', '运动鞋，休闲舒适', '高跟鞋，优雅气质', '赤足，自然随性', '玛丽珍鞋，复古可爱', '战斗靴，硬朗风格', '乐福鞋，学院气质'],
  accessory: ['腰间红色丝带，随风飘动', '精致耳环，闪烁光芒', '皮质手套，帅气利落', '宝石项链，华丽点缀', '发带束发，清新可爱', '墨镜，酷感十足', '帽子，遮阳又造型', '围巾，飘逸柔软'],
  background: ['雨夜霓虹街头，湿漉漉的地面倒映彩色灯光', '黄昏天台，城市天际线剪影', '夏日午后林荫道，斑驳树影', '晨雾弥漫的针叶林，阳光穿透树冠', '黄昏时分的海边悬崖，海浪拍打礁石', '星空下的草原，银河横跨天际', '午后阳光的书房，百叶窗条纹光影', '浮空岛屿，瀑布倾泻入云海'],
};

export async function GET(_req: NextRequest) {
  try {
    // 检查缓存
    if (cache && cache.expires > Date.now()) {
      return NextResponse.json({ ...cache.data, cached: true, updatedAt: new Date(cache.expires - CACHE_TTL).toISOString() });
    }

    // 调用 LongCat 搜索热门选项
    const prompt = `你是二次元 AI 生图提示词专家。请搜索当前网上最热门、最出片的二次元人物生图选项。

请从以下维度各推荐 8 个当前最热门的选项（不要写死的经典选项，要搜最新的流行趋势）：
1. 身体姿态（pose）
2. 表情（expression）
3. 镜头角度（camera）
4. 上装（top）
5. 下装（bottom）
6. 鞋子（shoes）
7. 配饰（accessory）
8. 背景场景（background）

搜索范围不限，只要是热门的人物相关选项即可。最终生成的图片风格是二次元动漫插画风格。

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "body": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "expression": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "camera": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "top": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "bottom": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "shoes": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "accessory": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"],
  "background": ["选项1", "选项2", "选项3", "选项4", "选项5", "选项6", "选项7", "选项8"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s 超时

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    clearTimeout(timeout);

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);

    let result: Record<string, string[]>;

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        // 验证每个维度都有数据
        const keys = ['body', 'expression', 'camera', 'top', 'bottom', 'shoes', 'accessory', 'background'];
        const valid = keys.every((k) => Array.isArray(parsed[k]) && parsed[k].length >= 5);
        if (valid) {
          result = parsed;
        } else {
          console.error('Hot options: invalid response format, using fallback');
          result = FALLBACK;
        }
      } catch {
        console.error('Hot options: JSON parse failed, using fallback');
        result = FALLBACK;
      }
    } else {
      console.error('Hot options: no JSON found, using fallback');
      result = FALLBACK;
    }

    // 写入缓存
    cache = { data: result, expires: Date.now() + CACHE_TTL };

    return NextResponse.json({ ...result, cached: false, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Hot options API error:', e);
    // 出错时返回兜底选项
    return NextResponse.json({ ...FALLBACK, cached: false, updatedAt: new Date().toISOString(), error: '搜索失败，使用默认选项' });
  }
}
```

- [ ] **Step 2: 验证构建**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 3: 提交**

```bash
git add src/app/api/hot-options/route.ts
git commit -m "feat: 创建热门选项动态获取 API，带 1 小时缓存和兜底"
```

---

### Task 2: 修改 SettingsStep 使用热门选项

**Files:**
- Modify: `src/components/SettingsStep.tsx`

- [ ] **Step 1: 添加 state 和加载逻辑**

在 `const [bgCategory, setBgCategory] = useState<string>('');` 之后添加：

```typescript
  const [hotOptions, setHotOptions] = useState<Record<string, string[]> | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadHotOptions = async () => {
      setOptionsLoading(true);
      try {
        const res = await fetch('/api/hot-options');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setHotOptions(data);
        }
      } catch { /* 静默失败，使用写死选项 */ }
      if (!cancelled) setOptionsLoading(false);
    };
    loadHotOptions();
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 2: 用热门选项替换写死的选项列表**

将写死的常量定义保留作为 fallback，在渲染时优先使用 hotOptions：

在 `BG_CAT_LABELS` 定义之后添加：

```typescript
  // 优先使用热门选项，否则 fallback 到写死选项
  const bodyOpts = hotOptions?.body ?? BODY_OPTIONS;
  const expressionOpts = hotOptions?.expression ?? EXPRESSION_OPTIONS;
  const cameraOpts = hotOptions?.camera ?? CAMERA_OPTIONS;
  const topOpts = hotOptions?.top ?? TOP_OPTIONS;
  const bottomOpts = hotOptions?.bottom ?? BOTTOM_OPTIONS;
  const shoesOpts = hotOptions?.shoes ?? SHOES_OPTIONS;
  const accessoryOpts = hotOptions?.accessory ?? ACCESSORY_OPTIONS;
  const bgFlatOpts = hotOptions?.background ?? BACKGROUND_CATEGORIES.flatMap((c) => c.options);
```

- [ ] **Step 3: 更新 TagSelector 引用**

将所有 `BODY_OPTIONS` 替换为 `bodyOpts`，`EXPRESSION_OPTIONS` 替换为 `expressionOpts`，以此类推。背景用 `bgFlatOpts` 替换 `BACKGROUND_CATEGORIES` 中的 options（保持两级结构，但热门背景平铺显示）。

- [ ] **Step 4: 验证构建**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 5: 提交**

```bash
git add src/components/SettingsStep.tsx
git commit -m "feat: SettingsStep 加载时获取热门选项，替换写死列表"
```

---

### Task 3: 修改 style API 使用热门选项

**Files:**
- Modify: `src/app/api/style/route.ts`

- [ ] **Step 1: 在 style API 中调用 hot-options**

在 `shuffle` 函数定义之前添加：

```typescript
    // 获取热门选项
    let hotOpts: Record<string, string[]> | null = null;
    try {
      const hotRes = await fetch('http://localhost:3000/api/hot-options');
      if (hotRes.ok) hotOpts = await hotRes.json();
    } catch { /* 使用写死 pool */ }

    const bodyPool = hotOpts?.body ?? [
      '正面全身站立，双手自然下垂', '侧身回眸，眼神望向镜头', '慵懒坐姿，一条腿自然弯曲',
      '低角度仰视，人物居中占满画面', '战斗姿态，身体微微前倾', '半身中景，手部动作自然',
      '背影伫立，望向远方', '俯拍视角，人物蜷缩或躺卧',
    ];
    // 同样处理 expressionPool, cameraPool, topPool, bottomPool, shoesPool, accessoryPool, backgroundPool
    // 每个维度都用 hotOpts?.xxx ?? [写死兜底]
```

- [ ] **Step 2: 验证构建**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 3: 提交**

```bash
git add src/app/api/style/route.ts
git commit -m "feat: style API 使用热门选项池，替换写死 pool"
```

---

### Task 4: 最终验证和推送

- [ ] **Step 1: 完整构建**

Run: `npm run build`
Expected: Compiled successfully

- [ ] **Step 2: 提交计划文档**

```bash
git add docs/superpowers/plans/2026-05-23-hot-options.md
git commit -m "docs: 添加热门选项动态获取实现计划"
```

- [ ] **Step 3: 推送**

```bash
git push origin master
```
