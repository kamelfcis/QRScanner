# Security Policy

## Environment Variables
- All secrets must be stored in `.env.local` (never committed)
- `.env.local` is in `.gitignore`
- Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Authentication
- Supabase Auth with email/password
- Session managed via HTTP-only cookies
- RLS policies enforce data access

## Row Level Security (RLS)
- Enabled on all tables
- Public read access for menu data
- Admin write access requires authentication
- Analytics allow anonymous INSERT for tracking

## Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security: max-age=63072000

## File Upload
- Validated file types: JPEG, PNG, WebP, PDF
- Max file size: 10MB
- Stored in Supabase Storage with RLS

## Rate Limiting
- Client-side rate limiting on search and API calls
- Server-side rate limiting via Supabase

## Reporting Vulnerabilities
Contact: security@wardashamya.com
