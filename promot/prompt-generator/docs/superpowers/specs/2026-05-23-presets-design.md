# 预设功能设计文档

> **For agentic workers:** 本文件为设计规格文档，实现计划见 `docs/superpowers/plans/2026-05-23-presets.md`。

## 目标

为 AI 生图提示词生成器添加两类预设功能：

1. **人物预设**：将查询好特征的人物保存到 localStorage，下次直接选用，无需重复查询
2. **预设配置（分组预设）**：将"来源类型 + 来源名称 + 人物名列表"打包保存，一键填充到输入框

## 数据存储

纯前端 localStorage，两个独立 key：

### 人物预设（character_presets）

```typescript
interface CharacterPreset {
  name: string;          // 人物名，作为唯一 key
  hairColor: string;
  hairstyle: string;
  eyeColor: string;
  skinColor: string;
  bodyType: string;
  featuredMark: string;
  sourceType?: SourceType;
  sourceName?: string;
}
// 存储结构：{ [name: string]: CharacterPreset }
// localStorage key: "character_presets"
```

### 分组预设（group_presets）

```typescript
interface GroupPreset {
  name: string;          // 预设组名，作为唯一 key
  sourceType: SourceType | '';
  sourceName: string;
  names: string[];       // 人物名列表
}
// 存储结构：{ [groupName: string]: GroupPreset }
// localStorage key: "group_presets"
```

## 架构

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/lib/presets.ts` | localStorage 读写封装，提供 CRUD API |
| `src/components/PresetPanel.tsx` | 预设面板 UI，展示分组预设和人物预设列表 |
| `src/components/EditPresetDialog.tsx` | 编辑弹窗组件（分组预设/人物预设通用） |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/types/index.ts` | 新增 `CharacterPreset`、`GroupPreset` 类型 |
| `src/components/CharacterStep.tsx` | 添加预设面板入口、保存预设按钮、人物预设快速填入 |

## UI 设计

### CharacterStep 改动

1. **预设按钮**：在"人物姓名"输入框旁新增"📋 预设"按钮，点击展开/收起预设面板
2. **预设面板（PresetPanel）**：
   - **分组预设区**：列出所有分组预设，每项显示名称、来源、人数。点击后自动填充来源类型、来源名称、人物名到输入框
   - **人物预设区**：列出所有已保存人物预设，每项显示名称+发色+瞳色。点击后直接将该人物特征填入人物列表（跳过查询）
   - 每个预设项右侧有编辑（✏️）和删除（🗑️）按钮
   - 底部有"保存当前为分组预设"按钮
3. **人物卡片 ⭐ 按钮**：每个人物查询结果卡片标题栏增加星标按钮，点击保存/更新该人物预设
4. **保存分组预设**：在确认按钮上方增加"保存为分组预设"按钮，将当前输入框内容保存为分组预设

### 编辑弹窗（EditPresetDialog）

- 使用简单的 fixed 定位全屏遮罩 + 居中卡片实现（不引入新依赖）
- 分组预设编辑：组名、来源类型、来源名称、人物名列表（逗号分隔文本框）
- 人物预设编辑：人物名、发色、发型、瞳色、肤色、身高体型、标志性特征
- 保存/取消按钮

## 数据流

### 保存人物预设
```
查询完成 → 显示特征卡片 → 用户点击 ⭐ 
→ presets.ts saveCharacterPreset(char)
→ localStorage.character_presets[name] = char
```

### 保存分组预设
```
用户输入来源+人物名 → 点击"保存为分组预设" → 弹出输入框输入组名
→ presets.ts saveGroupPreset({name, sourceType, sourceName, names})
→ localStorage.group_presets[name] = group
```

### 使用分组预设
```
用户点击分组预设项 
→ 自动填充 sourceType, sourceName, namesInput
→ 用户点击"批量查询"（或自动触发查询）
```

### 使用人物预设
```
用户点击人物预设项
→ 如果当前人物列表有空位或匹配同名人物，直接填入特征
→ 如果不在当前列表中，追加到输入框
```

## 边界处理

- 同名人物预设：覆盖保存，提示"已更新预设"
- 同名分组预设：覆盖保存，提示"已更新预设"
- 删除预设：需要二次确认
- localStorage 不可用时（SSR/隐私模式）：静默降级，预设功能不可用
- 人物预设点击填入时，如果该人物已在当前列表中且已有查询结果，询问是否覆盖
