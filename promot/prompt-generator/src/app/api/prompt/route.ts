import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';
import { getSkillSystemPrompt } from '@/lib/perfector';
import type { CharacterInfo, StyleSettings } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { characters, settings, feedback } = await req.json() as {
      characters: CharacterInfo[];
      settings?: StyleSettings;
      feedback?: string;
    };

    if (!characters || characters.length === 0) {
      return NextResponse.json({ error: '缺少人物数据' }, { status: 400 });
    }

    const s: StyleSettings = settings || {
      orientation: 'portrait',
      pose: { body: '', expression: '', camera: '' },
      clothing: { top: '', bottom: '', shoes: '', accessory: '' },
      background: '', artStyle: '', lighting: '', composition: '',
    };

    const aspectRatio = s.orientation === 'landscape' ? '16:9' : '9:16';
    const orientationText = s.orientation === 'landscape' ? '横屏（16:9，适合电脑壁纸）' : '竖屏（9:16，适合手机壁纸）';

    // 构建人物描述
    const charDescriptions = characters.map((char, idx) => {
      const displayName = char.sourceName
        ? `【${char.sourceName}/${char.name}】`
        : char.name;
      let desc = `人物${idx + 1}：${displayName}\n`;
      desc += `- 发色：${char.hairColor}\n`;
      desc += `- 发型：${char.hairstyle}\n`;
      desc += `- 瞳色：${char.eyeColor}\n`;
      desc += `- 肤色：${char.skinColor}\n`;
      if (char.age !== undefined && char.age > 0) {
        const ageDesc = char.age < 18 ? '少女' : `${char.age}岁`;
        desc += `- 年龄：${ageDesc}\n`;
      }
      desc += `- 身高体型：${char.bodyType}`;
      if (char.featuredMark) desc += `\n- 标志性特征：${char.featuredMark}`;
      return desc;
    }).join('\n\n');

    let userPrompt = `请根据以下人物信息生成 AI 生图提示词。

${charDescriptions}`;

    userPrompt += `\n\n画面方向：${orientationText}`;

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

    if (styleParts.length > 0) {
      userPrompt += '\n\n风格搭配：\n' + styleParts.map((p) => '- ' + p).join('\n');
    }

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

重要：
- 在描述中请使用「${characters.map((c) => c.name).join('、')}」作为人物标识，确保生图工具能准确识别该角色。
- 画面比例为${orientationText}，请在提示词中明确体现画幅方向（如"竖屏构图，人物全身呈现"或"横屏广角，场景开阔"）。

参考风格：二次元动漫插画、日系游戏CG质感、赛璐璐平涂、精致五官、冷白皮、8K超清细节。

画面质量要求：
- 主体必须清晰可识别，放在视觉中心
- 背景保持简洁、低噪点、低干扰，只提供空间感，不抢主体
- 主体区域细节精细，背景和辅助元素保持简单
- 风格关键词：clean editorial, publication-ready, soft diffused lighting, low visual noise
- 禁止项：no grain, no dirty texture, no random speckles, no messy background, no harsh glow`;

    const skillKnowledge = getSkillSystemPrompt();

    userPrompt += `

---
你是一位专业的AI生图提示词工程师。请遵循以下知识框架来生成和优化提示词：

${skillKnowledge}

---
请按照以上框架，先对当前提示词素材进行6维度诊断（主体/场景/风格/镜头/氛围/细节），然后生成最优化的中文提示词。

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "chinese": "完整中文提示词，将人物特征、服饰、姿态、背景、画风、光影、构图全部融合为一段流畅的中文描述，不要分段不要换行，一气呵成"
}`;

    if (feedback) {
      userPrompt += `\n\n用户对上一版提示词提出了以下修改意见，请根据意见调整生成：\n"${feedback}"`;
    }

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 3072,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Prompt API: no JSON found in response:', text.substring(0, 300));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Prompt API: JSON parse failed:', (parseErr as Error).message);
      try {
        const fixed = jsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '');
        parsed = JSON.parse(fixed);
      } catch (retryErr) {
        console.error('Prompt API: retry parse also failed:', (retryErr as Error).message);
        return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
      }
    }

    if (parsed.error) {
      console.error('Prompt API returned error:', parsed.error);
      return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 });
    }

    // 在提示词前面添加 [来源，人物名] 前缀
    const charNames = characters.map((c) => c.name).join('、');
    const sourceNames = characters
      .map((c) => c.sourceName)
      .filter(Boolean)
      .join('、');
    const prefix = sourceNames ? `[${sourceNames}，${charNames}]` : `[${charNames}]`;
    const chinese = parsed.chinese ? `${prefix}${parsed.chinese}` : '';

    return NextResponse.json({
      chinese,
    });
  } catch (e) {
    console.error('Prompt API error:', e);
    const msg = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ error: `生成失败：${msg}` }, { status: 500 });
  }
}
