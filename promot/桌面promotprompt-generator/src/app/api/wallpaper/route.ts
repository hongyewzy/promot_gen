import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') || 'portrait';
    const count = 12;
    const wallpapers = Array.from({ length: count }, (_, i) => {
      const id = Math.floor(Math.random() * 1000) + i;
      const seed = encodeURIComponent(q) + id;
      return {
        id: 'picsum-' + id,
        url: `https://picsum.photos/seed/${seed}/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/${seed}/400/300`,
        author: 'Picsum',
      };
    });
    return NextResponse.json({ wallpapers });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}