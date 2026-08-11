# New Restaurant Setup Guide

دليل تشغيل مطعم جديد (مثلاً **أكلة جمبري أنا**) كنسخة منفصلة: مشروع Supabase جديد + مشروع Vercel جديد + نفس الكود — بدون multi-tenant.

This playbook is for a **separate clone**. Do not reuse Warda's live Supabase project or Vercel env.

---

## Overview

| Step | What                                     |
| ---- | ---------------------------------------- |
| 1    | Copy / fork the repo                     |
| 2    | Create a **new** Supabase project        |
| 3    | Run migrations `001` -> `013`            |
| 4    | Apply new-restaurant settings template   |
| 5    | Create admin user                        |
| 6    | Confirm Storage buckets                  |
| 7    | Fill Settings (Dashboard)                |
| 8    | Import menu                              |
| 9    | Deploy new Vercel project + env + domain |
| 10   | Print QR to the new URL                  |
| 11   | Smoke-test                               |

---

---

## Two-branch GitHub layout (Warda + Aklet Gambary + Harameen)

One repo — [kamelfcis/QRScanner](https://github.com/kamelfcis/QRScanner) — three long-lived branches. **Runtime data never mixes**: each customer has its own Supabase project and Vercel project.

| Branch            | Customer                                            | Supabase                 | Vercel                                                                  |
| ----------------- | --------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `warda` (default) | Warda Shamya                                        | Existing Warda project   | Existing Warda deploy (e.g. engaz-qr-menu); Production Branch = `warda` |
| `aklet-gambary`   | أكلة جمبري أنا / Aklet Gambary                      | **New** Supabase project | **New** Vercel project; Production Branch = `aklet-gambary`             |
| `harameen`        | سوق الجملة شركة الحرمين / Harameen Wholesale Market | **New** Supabase project | **New** Vercel project `harameen`; Production Branch = `harameen`       |

### Checklist

1. **Akla Supabase** — create a new project → run migrations `001`–`014` → apply [`supabase/templates/new_restaurant_settings.sql`](../supabase/templates/new_restaurant_settings.sql) (or use branch `aklet-gambary` seed) → create admin user.
2. **Harameen Supabase** — create a new project → run migrations `001`–`014` → apply [`supabase/templates/harameen_settings.sql`](../supabase/templates/harameen_settings.sql) → run `node scripts/seed-harameen-categories.mjs` → create admin user.
3. **Akla Vercel** — import `QRScanner` → set **Production Branch = `aklet-gambary`** → env vars from Akla Supabase only (`NEXT_PUBLIC_APP_NAME`, URLs, keys).
4. **Harameen Vercel** — import `QRScanner` → set **Production Branch = `harameen`** → env vars from Harameen Supabase → deploy to `https://harameen.vercel.app`.
5. **Warda Vercel** — keep Production Branch = `warda` with Warda env; reconnect Git to `QRScanner` if it still points at the old repo.
6. **Domains + QR** — separate production domains; regenerate table QR codes per site URL.
7. **Never copy** Warda `.env` / `.env.local` into the Akla or Harameen projects.

After the fork point, branding defaults (app name, SEO, cart/theme localStorage keys, seed) may diverge on each branch. Shared product fixes can still be cherry-picked or merged carefully.

## 1. Copy / fork the repo

Choose one:

- **Dual-branch (this repo)** -- use `aklet-gambary` for Akla and `warda` for Warda (see [Two-branch GitHub layout](#two-branch-github-layout-warda--aklet-gambary)).
- **New GitHub repo** -- fork/copy only if you want a fully separate repository.
- **Same folder, two Vercel projects** -- only if you intentionally share one working tree.

```bash
git clone <your-new-or-existing-repo-url>
cd <project-folder>
npm install
cp .env.example .env.local
```

Fill `.env.local` with the **new** Supabase keys (see [`.env.example`](../.env.example)).

---

## 2. Create a new Supabase project

1. Open [supabase.com](https://supabase.com) -> **New project**.
2. Pick org, name (e.g. `akla-gambari-ana`), region, DB password.
3. Wait until the project is healthy.
4. From **Project Settings -> API**, copy:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY` (**server only**, never expose to the browser)

---

## 3. Run migrations in order (`001` -> `013`)

In the Supabase SQL Editor (or CLI), run each file under `supabase/migrations/` **in numeric order**:

| #   | File                                | Notes                                                            |
| --- | ----------------------------------- | ---------------------------------------------------------------- |
| 001 | `001_initial_schema.sql`            | Tables                                                           |
| 002 | `002_rls_policies.sql`              | RLS                                                              |
| 003 | `003_seed_data.sql`                 | **Warda defaults** (name, SAR, sample menu) -- see step 4        |
| 004 | `004_qr_system.sql`                 | QR / tables                                                      |
| 005 | `005_menu_import.sql`               | Import jobs                                                      |
| 006 | `006_testimonials.sql`              | Testimonials                                                     |
| 007 | `007_analytics_enhanced.sql`        | Analytics                                                        |
| 008 | `008_analytics_hardening.sql`       | Analytics hardening                                              |
| 009 | `009_ordering_analytics.sql`        | Ordering analytics                                               |
| 010 | `010_storage_image_buckets_rls.sql` | **Required** for logo/product uploads (`logos`, `products`, ...) |
| 011 | `011_theme_and_hero_settings.sql`   | Theme + hero keys                                                |
| 012 | `012_story_image_settings.sql`      | Story image keys                                                 |
| 013 | `013_contact_defaults_egypt.sql`    | Egypt contact defaults                                           |

**Important about `003`:**

- It seeds **وردة الشامية / Warda Shamya**, currency `SAR`, and sample Lebanese dishes.
- For a new restaurant, either:
  - Run `003` then **overwrite** settings with the template in step 4 (and delete sample products/categories if you do not want them), **or**
  - Skip inserting Warda sample products from `003` and only keep schema + empty/default categories you need.

Always keep migrations **001-002** and **004-013**. Do not skip **010** -- image uploads will fail without those buckets/policies.

---

## 4. Apply new-restaurant settings template

After schema migrations, run:

[`supabase/templates/new_restaurant_settings.sql`](../supabase/templates/new_restaurant_settings.sql)

That template:

- `UPDATE`s `restaurant`, `theme`, and `hours` for **أكلة جمبري أنا** placeholders
- Sets currency to **EGP**, Egypt address placeholders, seafood-friendly theme colors
- Is safe to run after `003` (overwrites Warda seed values)

Edit the `YOUR_*` placeholders (phone, WhatsApp, exact address, hours) before or after running.

Optional cleanup of Warda sample menu from `003`:

```sql
-- Optional: remove Warda sample products/categories before importing the real menu
DELETE FROM public.products;
DELETE FROM public.categories;
```

Then recreate categories that fit the new restaurant (seafood, etc.) via Dashboard or SQL.

---

## 5. Create admin user

1. Supabase -> **Authentication -> Users -> Add user**.
2. Email + password (or invite).
3. Confirm the user can sign in at `/login` once the app is running against this project.

If your RLS expects a profile/admin role, ensure that user matches whatever `002_rls_policies.sql` / app auth flow requires (same as Warda setup).

---

## 6. Storage buckets

Migration **010** creates (or updates) these buckets:

| Bucket       | Public | Use              |
| ------------ | ------ | ---------------- |
| `logos`      | yes    | Restaurant logo  |
| `covers`     | yes    | Covers           |
| `categories` | yes    | Category images  |
| `products`   | yes    | Product images   |
| `assets`     | yes    | Misc assets      |
| `qr`         | yes    | QR assets        |
| `pdfs`       | no     | Menu PDF uploads |

Verify under **Storage**. If a bucket is missing, re-run `010_storage_image_buckets_rls.sql`.

---

## 7. Fill Settings from Dashboard

In the admin dashboard (**Settings**), set at least:

- [ ] Name AR / EN (`أكلة جمبري أنا` / `Akla Gambari Ana`)
- [ ] Phone + WhatsApp (Egypt format, e.g. `2010XXXXXXXX`)
- [ ] Address AR / EN
- [ ] Currency **EGP**
- [ ] Tax / service charge (as needed for Egypt)
- [ ] Opening hours
- [ ] Logo upload (`logos` bucket)
- [ ] Hero / story images if used
- [ ] Google Maps URL + email (optional)

Prefer Dashboard values over hardcoding in the repo.

---

## 8. Import menu

Options:

1. **Dashboard -> Import** -- upload PDF/image (needs `GEMINI_API_KEY` + optional `GEMINI_MODEL` on the server).
2. **Manual** -- create categories and products in the dashboard.
3. **SQL / CSV** -- bulk insert if you already have structured data.

Do not reuse Warda product IDs or images from the old project.

---

## 9. New Vercel project + env + domain

1. Push the clone to GitHub (if not already).
2. [vercel.com](https://vercel.com) -> **Add New Project** -> import **this** repo (or the new fork).
3. Set environment variables (Production + Preview as needed):

| Variable                        | Required     | Example                                |
| ------------------------------- | ------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes          | `https://xxxx.supabase.co`             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes          | anon key                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes (server) | service role                           |
| `NEXT_PUBLIC_APP_NAME`          | Recommended  | `أكلة جمبري أنا` or `Akla Gambari Ana` |
| `NEXT_PUBLIC_APP_URL`           | Recommended  | `https://your-domain.com`              |
| `NEXT_PUBLIC_SITE_URL`          | Recommended  | `https://your-domain.com`              |
| `GEMINI_API_KEY`                | Optional     | for PDF import                         |
| `GEMINI_MODEL`                  | Optional     | default in app if omitted              |

4. Deploy.
5. Attach custom domain (e.g. `aklagambariana.com`).
6. Update `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` to the final HTTPS URL and redeploy if needed.

See also [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## 10. Print QR to the new site URL

1. In the dashboard, create QR codes / table links pointing to the **new** site URL (welcome or menu), not `wardashamya.com`.
2. Download PNG/PDF and print for tables.
3. Spot-check one printed QR with a phone camera.

---

## 11. Smoke-test checklist

- [ ] `/api/health` OK
- [ ] Admin login works
- [ ] Upload a product image (Storage + RLS)
- [ ] Welcome -> choose dining mode -> menu
- [ ] Add to cart -> checkout -> WhatsApp deep link opens with order text
- [ ] Restaurant name / currency show as EGP (not Warda / SAR)
- [ ] Logo and hero look correct on mobile

---

## Branding / hardcode checklist (clone before go-live)

Env vars alone do **not** replace every Warda string. Before launch, review:

### Prefer env (do first)

- [ ] `NEXT_PUBLIC_APP_NAME` -- e.g. `أكلة جمبري أنا`
- [ ] `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` -- new domain (not `https://wardashamya.com`)

### Metadata & SEO fallbacks

- [ ] [`src/app/layout.tsx`](../src/app/layout.tsx) -- title/description/OG still say `Warda Shamya`; default `SITE_URL` is `https://wardashamya.com`
- [ ] [`src/lib/seo/metadata.ts`](../src/lib/seo/metadata.ts) -- hardcoded site name / Riyadh copy
- [ ] [`src/lib/seo/structuredData.ts`](../src/lib/seo/structuredData.ts) -- `info@wardashamya.com` fallback
- [ ] [`src/app/sitemap.ts`](../src/app/sitemap.ts) / [`src/app/robots.ts`](../src/app/robots.ts) -- site URL fallback

### Client storage keys (isolation if customers share a device)

- [ ] Cart persist: `warda-cart-v1` in [`src/stores/cart-store.ts`](../src/stores/cart-store.ts)
- [ ] Theme: `warda-shamya-theme` in [`src/components/providers/Providers.tsx`](../src/components/providers/Providers.tsx)
- [ ] Dining mode / table / favorites / recent: `warda-dining-mode`, `warda-table`, `warda-favorites`, `warda-recent`, ...

Rename keys (e.g. `akla-cart-v1`) only if you need isolation from a previous Warda visit on the same browser.

### Visual assets & CSS

- [ ] Default hero paths like `/hero/warda-storefront.jpg` (welcome + landing)
- [ ] `public/og-image.png`, favicons, PWA icons
- [ ] Optional: brand tokens in [`src/app/globals.css`](../src/app/globals.css) (`--color-brand-primary`, gold accents) if seafood branding should differ from Warda gold

### Reports / misc

- [ ] Export filename prefix `warda-report-` in dashboard reports (cosmetic)

---

## After you finish

Flow reminder:

```text
Bootstrap kit -> Clone repo -> New Supabase + migrations
  -> new_restaurant_settings.sql -> New Vercel + env
  -> Products + logo -> QR to new domain
```

Out of scope for this kit: creating the live Supabase/Vercel projects for you, multi-tenant schema, and importing a real menu PDF without credentials/file.
