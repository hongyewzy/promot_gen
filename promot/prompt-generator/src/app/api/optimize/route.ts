import { NextRequest, NextResponse } from 'next/server';
import { longcat, LONGCAT_MODEL } from '@/lib/longcat';
import { extractJson } from '@/lib/utils';
import { getSkillSystemPrompt } from '@/lib/perfector';

export async function POST(req: NextRequest) {
  try {
    const { prompt, tool, mode } = await req.json() as {
      prompt: string;
      tool?: string;
      mode?: 'quick' | 'diagnose' | 'dialog';
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: '提示词不能为空' }, { status: 400 });
    }

    const skillKnowledge = getSkillSystemPrompt();
    const toolText = tool ? `目标工具：${tool}` : '目标工具：通用（适配多数工具）';
    const modeText = mode === 'diagnose' ? '诊断模式' : mode === 'dialog' ? '对话模式' : '快速模式';

    const userPrompt = `你是一位专业的AI生图提示词工程师。请优化以下用户提示词。

用户原始提示词：
"${prompt}"

${toolText}
交互模式：${modeText}

---
请遵循以下知识框架来诊断和优化提示词：

${skillKnowledge}

---
请按以下步骤执行：

Step 1: 6维度诊断
按"主体/场景/风格/镜头/氛围/细节"逐一评分（0-2分），给出每个维度的分数和改进建议。

Step 2: 优化
基于诊断结果，生成优化后的完整中文提示词。

严格只返回以下 JSON 对象，不要任何解释、不要 markdown 代码块、不要其他任何内容：
{
  "diagnosis": {
    "dimensions": [
      {"name": "主体", "score": 0, "suggestion": "改进建议"},
      {"name": "场景", "score": 0, "suggestion": "改进建议"},
      {"name": "风格", "score": 0, "suggestion": "改进建议"},
      {"name": "镜头", "score": 0, "suggestion": "改进建议"},
      {"name": "氛围", "score": 0, "suggestion": "改进建议"},
      {"name": "细节", "score": 0, "suggestion": "改进建议"}
    ],
    "totalScore": 0
  },
  "optimized": "优化后的完整中文提示词"
}`;

    const msg = await longcat.messages.create({
      model: LONGCAT_MODEL,
      max_tokens: 3072,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error('Optimize API: no JSON found:', text.substring(0, 300));
      return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      try {
        const fixed = jsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '');
        parsed = JSON.parse(fixed);
      } catch {
        return NextResponse.json({ error: 'AI 返回格式异常，请重试' }, { status: 500 });
      }
    }

    if (parsed.error) {
      return NextResponse.json({ error: '优化失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      diagnosis: parsed.diagnosis || { dimensions: [], totalScore: 0 },
      optimized: parsed.optimized || '',
    });
  } catch (e) {
    console.error('Optimize API error:', e);
    const msg = e instanceof Error ? e.message : '未知错误';
    return NextResponse.json({ error: `优化失败：${msg}` }, { status: 500 });
  }
}
