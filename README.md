# Warda Shamya Restaurant Platform

A premium digital restaurant platform built with Next.js 16, Supabase, and TypeScript.

## Features

### Public Menu
- Responsive menu with category browsing
- Dining/Takeaway mode toggle
- Search with real-time results
- Favorites (localStorage)
- Image lightbox with zoom
- Recently viewed dishes
- Recommended dishes
- Bilingual (Arabic/English)
- Dark mode support
- PWA with offline support

### Admin Dashboard
- Live KPI cards with real-time updates
- Menu management (Categories, Products, Gallery, Offers)
- QR Code generation (5 templates)
- Table management
- AI-powered menu import (PDF/OCR)
- Testimonials management
- Settings management
- Analytics & Reports
- Search analytics
- Customer insights
- Heatmaps (peak hours, table usage)
- Export (CSV, Excel, PDF, Print)
- Notifications

### Technical
- Next.js 16 App Router
- Supabase (Auth, Database, Storage, Realtime)
- React Query v5
- Framer Motion animations
- Recharts for data visualization
- Tailwind CSS v4
- shadcn/ui components
- Vitest + Playwright testing
- Docker support
- CI/CD with GitHub Actions

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account

### Installation
```bash
git clone https://github.com/kamelfcis/WardaQRResturant.git
cd WardaQRResturant
npm install
```

### Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key (server-side only)

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production
```bash
npm run build
npm start
```

### Docker
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# All checks
npm run check
```

## Project Structure
```
warda-shamya/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Authentication pages
│   │   ├── (dashboard)/  # Admin dashboard
│   │   ├── (menu)/       # Public menu
│   │   ├── (public)/     # Landing page
│   │   └── api/          # API routes
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific
│   │   ├── landing/      # Landing page sections
│   │   ├── menu/         # Menu components
│   │   ├── pwa/          # PWA components
│   │   ├── shared/       # Shared components
│   │   └── ui/           # shadcn/ui components
│   ├── hooks/            # React hooks
│   ├── lib/              # Utilities
│   │   ├── import/       # AI menu import
│   │   ├── qr/           # QR code utilities
│   │   ├── export/       # Export utilities
│   │   └── seo/          # SEO utilities
│   └── types/            # TypeScript types
├── supabase/             # Database migrations
├── tests/                # Test files
├── public/               # Static assets
└── docs/                 # Documentation
```

## Database
12 tables with Row Level Security:
- categories, subcategories, products, product_gallery
- offers, gallery, qr_codes, restaurant_tables
- analytics, search_analytics, settings, testimonials
- notifications, import_jobs

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `OPENAI_API_KEY` | No | OpenAI API key for AI menu import |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL for SEO (default: http://localhost:3000) |

## License

Private - Warda Shamya Restaurant

## Support

For support, email: support@wardashamya.com
