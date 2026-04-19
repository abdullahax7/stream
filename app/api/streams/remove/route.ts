import { NextResponse } from 'next/server';
import { streamManager } from '@/lib/streamManager';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const success = streamManager.removeStream(id);
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
