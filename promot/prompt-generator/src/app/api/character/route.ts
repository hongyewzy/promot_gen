import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';
import { searchCharacterAppearance, buildCharacterQuery, extractWikiContent } from '@/lib/tavily';
import type { SourceType } from '@/types';

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
    let sourceConstraint = '';
    if (sourceType && sourceName) {
      sourceHint = `（来自${sourceType}《${sourceName}》）`;
      sourceConstraint = `\n\n重要：该人物仅来自${sourceType}《${sourceName}》，不要混淆其他同名作品或同系列作品。必须只返回该作品中该人物的官方设定。`;
    } else if (sourceType) {
      sourceHint = `（来自${sourceType}）`;
      sourceConstraint = `\n\n重要：该人物来自${sourceType}，请确认具体作品名称，不要混淆其他同名作品。`;
    } else if (sourceName) {
      sourceHint = `（来自《${sourceName}）》`;
      sourceConstraint = `\n\n重要：该人物仅来自《${sourceName}》，不要混淆其他同名作品或同系列作品。必须只返回该作品中该人物的官方设定。`;
    }

    // 通过 Tavily 搜索官方外貌资料（优先使用 wiki 内容）
    let tavilyContext = '';
    try {
      const tavilyQuery = buildCharacterQuery(name, sourceType, sourceName);
      const tavilyResult = await searchCharacterAppearance(tavilyQuery, 8);

      if (tavilyResult.results && tavilyResult.results.length > 0) {
        // 优先提取 wiki 类来源的详细内容
        const wikiContent = extractWikiContent(tavilyResult.results);
        tavilyContext = `## 搜索到的官方资料（优先使用【官方wiki】标记的内容）\n${wikiContent}`;
        console.log('Tavily search completed for:', name, '- results:', tavilyResult.results.length);
      }
    } catch (tavilyErr) {
      console.error('Tavily search failed, continuing without search context:', tavilyErr);
      // Tavily 搜索失败时不阻断主流程，继续用 LongCat 原有逻辑
    }

    const message = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `你是${sourceHint}角色「${name}」的官方设定专家。请根据以下搜索到的官方资料，返回该角色的标准外貌特征。${!sourceType && !sourceName ? '同时判断该人物最可能的来源类型和来源名称。' : ''}

${tavilyContext ? `## 搜索到的官方资料\n${tavilyContext}\n\n` : ''}要求：
- 只返回官方设定中的外貌特征，不要加入同人创作或非官方描述
- 发色、瞳色、发型必须精确到官方配色（如"银白色渐变"而非简单的"白色"）
- 标志性特征只返回官方设定中明确存在的（如官方插画中可见的配饰、伤疤、特殊标记）
- 如果官方设定中有多个版本（如不同皮肤、不同时期），返回最经典/默认版本的设定
- 【重要】搜索结果中标记为【官方wiki】的内容来自萌娘百科、Fandom、米游社等可信来源，必须优先使用这些信息
- 【重要】不要使用搜索结果中 Reddit、论坛等【参考】标记的内容作为主要依据
- 【重要】搜索结果可能包含同名但不同作品的角色（如崩坏3希儿、崩坏学园2希儿、星穹铁道希儿），必须只使用与用户指定来源匹配的那个
- 【重要】如果某个结果标题中明确标注了来源（如"希儿(星穹铁道)"、"希儿·芙乐艾(崩坏3)"），请根据用户指定的来源选择对应的结果${sourceConstraint}

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "name": "人物姓名",
  "hairColor": "发色（精确描述，如：银白色渐变、深蓝黑色）",
  "hairstyle": "发型（精确描述，如：齐刘海长直发、双丸子头、短发微卷）",
  "eyeColor": "瞳色（精确描述，如：琥珀色异瞳、深红色）",
  "skinColor": "肤色（如：白皙、小麦色、古铜色）",
  "age": 年龄数字（整数，如已知官方年龄则填写，未知则填写0）,
  "bodyType": "身高体型（如：165cm苗条、180cm健壮、娇小可爱）",
  "featuredMark": "标志性特征（如：左眼下方泪痣、右手黑色手套、额头闪电疤痕、兽耳、机械臂）"${!sourceType && !sourceName ? ',\n  "sourceType": "来源类型（游戏/动漫/漫画/小说）",\n  "sourceName": "来源名称（如：崩坏星穹铁道）"' : ''}
}
所有值用中文。`,
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Character API: no JSON found:', text.substring(0, 300));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Character API: JSON parse failed:', (parseErr as Error).message);
      try {
        const fixed = jsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '');
        parsed = JSON.parse(fixed);
      } catch (retryErr) {
        console.error('Character API: retry parse also failed:', (retryErr as Error).message);
        return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
      }
    }

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
      age: typeof parsed.age === 'number' && parsed.age > 0 ? parsed.age : undefined,
      sourceType: sourceType || parsed.sourceType || undefined,
      sourceName: sourceName || parsed.sourceName || undefined,
    });
  } catch (e) {
    console.error('Character API error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
