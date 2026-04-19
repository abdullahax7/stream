import { NextResponse } from 'next/server';
import { streamManager } from '@/lib/streamManager';

export async function GET() {
  return NextResponse.json(streamManager.getStreams());
}

export async function POST(request: Request) {
  try {
    const { name, inputUrl } = await request.json();
    
    if (!name || !inputUrl) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const stream = streamManager.startStream(name, inputUrl);
    return NextResponse.json(stream);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
