# Architecture Guide

## Overview
Warda Shamya is a monolithic Next.js application serving both public-facing restaurant website and admin dashboard.

## System Architecture
```
Client (Browser/Mobile)
    ↓
Next.js 16 (App Router)
    ↓
├── Public Routes (/, /menu)
├── Dashboard Routes (/dashboard/*)
├── API Routes (/api/*)
└── Auth Routes (/login)
    ↓
Supabase
├── PostgreSQL (Database)
├── Auth (Authentication)
├── Storage (File uploads)
└── Realtime (Live updates)
```

## Data Flow
1. **Public Menu**: Client → React Query → Supabase → Render
2. **Admin CRUD**: Client → React Query Mutation → Supabase → Cache Invalidation → Re-render
3. **Realtime**: Supabase Channel → WebSocket → React Query Invalidation → Re-render
4. **Analytics**: Client → trackEvent() → Supabase INSERT (fire-and-forget)

## Key Patterns
- **Query Key Factory**: Centralized cache key management
- **Optimistic Updates**: Immediate UI feedback
- **Stale-While-Revalidate**: Background data freshness
- **Dynamic Imports**: Code splitting for heavy components
- **Suspense Boundaries**: Streaming and loading states

## Security Model
- RLS on all tables
- Public read for menu data
- Authenticated write for admin
- Client-side rate limiting
- Security headers via Next.js config
