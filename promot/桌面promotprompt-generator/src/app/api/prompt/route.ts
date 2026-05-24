import { anthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';
import type { CharacterInfo, StyleAnalysis } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { character, styleAnalysis } = await req.json() as {
      character: CharacterInfo;
      styleAnalysis: StyleAnalysis;
    };

    if (!character || !styleAnalysis) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const prompt = 'Character: ' + JSON.stringify(character) +
      '
Style: ' + JSON.stringify(styleAnalysis) +
      '

Generate an AI image prompt. Return ONLY JSON: {chinese, english}. chinese should be a detailed Chinese description. english should be a Midjourney-style English prompt with comma-separated phrases.';

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (msg.content[0] as { type: string; text: string }).text;
    const m = text.match(/{[sS]*}/);
    if (!m) return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    return NextResponse.json(JSON.parse(m[0]));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}