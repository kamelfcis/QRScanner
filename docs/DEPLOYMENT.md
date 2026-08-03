# Deployment Guide

## Vercel (Recommended)
1. Push code to GitHub
2. Go to vercel.com → Import Project
3. Select repository
4. Configure environment variables
5. Deploy

## Docker
```bash
# Build
docker build -t warda-shamya .

# Run
docker run -p 3000:3000 warda-shamya
```

## Environment Setup
1. Create Supabase project
2. Run migrations
3. Create admin user
4. Set environment variables
5. Deploy

## Post-Deployment
1. Verify health endpoint: `/api/health`
2. Test login flow
3. Create test data
4. Verify analytics tracking
5. Test PWA installation
