import { anthropic } from '@/lib/anthropic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Describe the appearance of "${name}". Return ONLY JSON: {name, hairColor, eyeColor, skinTone, hairstyle, height, build, distinctiveFeatures}. All values in Chinese. If unknown, use cultural stereotypes.`,
        },
      ],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const m = text.match(/{[sS]*}/);
    if (!m) return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    return NextResponse.json(JSON.parse(m[0]));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}