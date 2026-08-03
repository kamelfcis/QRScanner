# Developer Guide

## Setup
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Run `npm run dev`

## Architecture
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State**: React Query v5 + Zustand
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

## Code Conventions
- Use `'use client'` for interactive components
- Use `cn()` for class merging (from `@/lib/utils`)
- Follow React Query patterns for data fetching
- Use Zod for validation
- Use Framer Motion for animations

## Adding New Features
1. Create types in `src/types/database.ts`
2. Create schema in `src/types/schema.ts`
3. Create hooks in `src/hooks/`
4. Create components in `src/components/`
5. Create page in `src/app/`
6. Add tests

## Database Changes
1. Create migration in `supabase/migrations/`
2. Run against Supabase via Management API
3. Update types if needed

## Testing
- Unit tests: `tests/unit/`
- Component tests: `tests/components/`
- E2E tests: `tests/e2e/`
- Run: `npm test`

## Code Quality
- ESLint for linting
- Prettier for formatting
- Husky for git hooks
- TypeScript for type safety
