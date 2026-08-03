import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  return NextResponse.json({
    status: 'ok',
    message: 'Logging endpoint available in development mode',
    timestamp: new Date().toISOString(),
  });
}
