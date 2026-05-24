# AI 生图提示词生成器 - 设计文档

> 创建日期：2026-05-21

## 目标

Web 应用：用户输入人物名字，AI 联网查询人物形象，用户选择参考壁纸，AI 提取壁纸风格，最终合成双语（中文 + 英文）AI 生图提示词。

## 核心流程

```
用户输入人物名字
       ↓
[步骤1] LongCat API 联网查询人物形象（发色、瞳色、发型、衣着等）
       ↓
展示查询结果 → 用户确认/修改（支持重新查询）
       ↓
[步骤2] 搜索/推荐壁纸（用户搜索或上传）
       ↓
展示候选壁纸 → 用户选择（支持重新搜索）
       ↓
[步骤3] Qwen3.5-9B 分析壁纸风格特征
       ↓  (Qwen 不可用时降级)
       ↓  LongCat 按模板生成风格特征
       ↓
[步骤4] LongCat API 合成最终提示词（中文描述 + 英文提示词）
       ↓
输出结果 → 用户可复制/重新生成
```

每个步骤都支持"重新查询/重新选择"。

## 两套 API 分工

| 场景 | API | 模型 | 说明 |
|------|-----|------|------|
| 人物联网搜索 | 美团 LongCat | LongCat-2.0-Preview | 查询发色、瞳色等形象特征 |
| 提示词合成 | 美团 LongCat | LongCat-2.0-Preview | 生成中英文提示词 |
| 壁纸风格分析（主） | 魔塔 ModelScope | Qwen3.5-9B | 视觉多模态，分析图片风格 |
| 壁纸风格分析（降级） | 美团 LongCat | LongCat-2.0-Preview | Qwen 不可用时，按模板生成风格 |

## 降级模板（Qwen 不可用时）

当 Qwen3.5-9B 不可用（次数到期/调用失败）时，LongCat 按以下模板生成风格提示词：

```
[核心描述] + [面部细节] + [发型发色] + [服装配饰] + [动作姿势] + [风格质感] + [光影氛围]
```

**字段说明**：
- **核心描述**：年龄、身份（如：20岁剑客、高冷霸总、异域少女）
- **面部细节**：肤色（冷白皮/瓷感）、眼神（深邃/疏离）、瞳色、五官特征（剑眉/丹凤眼/薄唇）
- **发型发色**：长度、质感（根根分明/蓬松）、细节（碎发/发冠/编发）
- **服装配饰**：材质（锦缎/欧根纱/皮革）、装饰（刺绣/金属配饰/珠宝）、包包或武器
- **动作姿势**：站姿/坐姿/回眸/俯视/怼脸拍等
- **风格质感**：决定画风的关键词（高级CG插画、BJD质感、伪厚涂、8K超清、大师级刻画）
- **光影氛围**：镜头视角（俯拍/近景特写）、光线（逆光/达尔效应/冷色调）、环境（暴雪/黑夜/校园走廊）

**降级提示**：页面上需提示用户"当前使用默认风格模板（图片分析不可用）"。

### 示例输出

示例1：
> 20多岁古代男子，高级CG概念插画，模糊感，高清晰度，额前碎发，背景全黑，黑发全披发，精致五官，冷白皮，戴黑色斗笠围黑纱，黑夜窗边茶桌，冷酷眼神仰拍，歪头侧脸，手拿酒壶，怼脸拍。

示例2：
> 20岁东方面孔的时尚冷酷少女，暗黑叛逆气场。精致的BJD娃娃脸，皮肤与发丝展现出逼真的油脂感与晶莹光泽。亮银色浓密长发，根根分明。着装怪异前卫，手臂刻有神秘的几何图案纹身。三维游戏CG质感，融合精美的韩漫插画风格，强烈的赛博朋克霓虹光影。超级细节刻画，极致蓝光画质，冷艳且富有视觉冲击力的超级光感。

## 页面结构

单页应用，分三步导航：

| 步骤 | 内容 |
|------|------|
| 步骤1 | 输入框输入人物名 → 查询 → 结果卡片（可编辑）→ 确认 |
| 步骤2 | 搜索壁纸 → 网格展示缩略图 → 点击选中 → 确认（支持上传） |
| 步骤3 | 展示合成结果：中文描述 + 英文提示词 → 一键复制 |

## 数据模型

### Character（人物）
```json
{
  "id": "uuid",
  "name": "初音未来",
  "attributes": {
    "hairColor": "青绿色",
    "hairStyle": "双马尾",
    "eyeColor": "绿色",
    "skinColor": "白皙",
    "clothingStyle": "未来风制服",
    "other": "..."
  }
}
```

### Wallpaper（壁纸）
```json
{
  "id": "uuid",
  "url": "https://...",
  "thumbnailUrl": "https://...",
  "style": {
    "artStyle": "赛博朋克",
    "pose": "站立",
    "expression": "微笑",
    "clothing": "制服",
    "background": "城市夜景",
    "action": "回眸",
    "lighting": "霓虹灯光",
    "colorTone": "冷色调"
  },
  "isFallback": false
}
```

`isFallback: true` 表示风格来自降级模板而非 Qwen 图片分析。

### Prompt（输出）
```json
{
  "characterId": "uuid",
  "wallpaperId": "uuid",
  "chinese": "一位青绿色双马尾的少女，绿色瞳孔，身穿未来风制服，赛博朋克风格，冷色调，神秘氛围...",
  "english": "A girl with cyan twin-tails, green eyes, wearing futuristic uniform, cyberpunk style, cool tones, mysterious atmosphere, detailed illustration --ar 3:4 --v 6"
}
```

## API 设计

| 路由 | 方法 | 功能 | 底层 API |
|------|------|------|----------|
| `/api/character/search` | POST | 输入人物名，返回形象特征 | LongCat |
| `/api/wallpaper/search` | POST | 搜索壁纸，返回缩略图列表 | Picsum 占位 |
| `/api/wallpaper/analyze` | POST | 分析壁纸风格特征 | Qwen3.5-9B / LongCat 降级 |
| `/api/prompt/generate` | POST | 合成最终提示词 | LongCat |

## 环境变量

| 变量 | 值 | 用途 |
|------|-----|------|
| `LONGCAT_API_KEY` | `ak_2uZ1Gq5uV1Mx8ZD40C3ze8fd1Aw4P` | 美团 LongCat API Key |
| `LONGCAT_BASE_URL` | `https://api.longcat.chat/anthropic` | 美团 LongCat API 地址 |
| `MODELSCOPE_API_KEY` | `ms-16484e53-5c3b-47e6-9117-e02489fdc191` | 魔塔 ModelScope API Key |
| `MODELSCOPE_BASE_URL` | `https://api-inference.modelscope.cn` | 魔塔 API 地址 |

## 技术架构

- **前端**：Next.js 14 (App Router) + TailwindCSS + shadcn/ui
- **状态管理**：React Context（步骤间共享数据）
- **部署**：Vercel

## 项目结构

```
prompt-generator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── character/route.ts    # 人物查询 (LongCat)
│   │   │   ├── wallpaper/route.ts    # 壁纸搜索 (Picsum)
│   │   │   ├── analyze/route.ts      # 壁纸分析 (Qwen/LongCat 降级)
│   │   │   └── prompt/route.ts       # 提示词生成 (LongCat)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 主页面（三步流程）
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 组件
│   │   ├── CharacterStep.tsx         # 步骤1
│   │   ├── WallpaperStep.tsx         # 步骤2
│   │   ├── PromptStep.tsx            # 步骤3
│   │   └── StepIndicator.tsx         # 步骤指示器
│   ├── lib/
│   │   ├── longcat.ts                # LongCat API 客户端
│   │   ├── modelscope.ts             # ModelScope Qwen API 客户端
│   │   └── utils.ts
│   └── types/
│       └── index.ts                  # 类型定义
└── .env.local.example
```

## 后续迭代方向

- 支持批量输入多个人物
- 提示词历史记录
- 支持更多生图工具格式（SD、DALL-E 等）
- 接入真实壁纸源（Midjourney 社区、Unsplash 等）
