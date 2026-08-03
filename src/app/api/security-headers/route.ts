import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security':
        'max-age=63072000; includeSubDomains; preload',
    },
    status: 'configured',
  });
}
