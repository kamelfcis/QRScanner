import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'engaz-landing',
    time: new Date().toISOString(),
  });
}
