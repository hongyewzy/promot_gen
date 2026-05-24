import { anthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this image art style. Return ONLY JSON: {style, action, expression, clothing, background, lighting, colorPalette}. All values in Chinese.' },
          { type: 'image', source: { type: 'url', url: imageUrl } },
        ],
      }],
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