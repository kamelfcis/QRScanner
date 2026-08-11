# Engaz Admin — Customer Provisioning Control Plane

Engaz Admin is a **separate** Next.js app on branch `engaz-admin`. It is **not** a customer menu. Deployed as `https://engazadmin.vercel.app`.

## What it does

1. Super-admin signs in (Engaz Admin Supabase Auth + `super_admins` row).
2. Creates a customer via wizard (template → slug/names → customer Supabase credentials).
3. Runs an automated provision job:
   - Apply customer migrations `001`–`014` from `supabase/migrations/`
   - Clear categories/products (empty menu)
   - Upsert restaurant/theme/hours settings from template
   - Create customer dashboard admin user
   - Create git branch from template (`warda` | `aklet-gambary` | `harameen`)
   - Commit rebrand + `CUSTOMER_HANDOFF.md`
   - Create Vercel project `{slug}`, set env, deploy production, alias `{slug}.vercel.app`
4. Surfaces production URL + admin credentials in the UI.

## Templates

| Template ID | Source branch   | Business    | Defaults                                             |
| ----------- | --------------- | ----------- | ---------------------------------------------------- |
| `warda`     | `warda`         | restaurant  | dine-in + takeaway + delivery; QR `/welcome`         |
| `aklet`     | `aklet-gambary` | restaurant  | same fulfillment; empty menu                         |
| `harameen`  | `harameen`      | supermarket | `NEXT_PUBLIC_FULFILLMENT_MODE=delivery_only`; QR `/` |

## Local setup

1. Create a **dedicated** Supabase project for Engaz Admin.
2. Apply schema:

```bash
# In Supabase SQL editor, run:
# engaz-supabase/migrations/001_engaz_schema.sql
```

3. Create first Auth user, then insert:

```sql
insert into public.super_admins (user_id, email, display_name)
values ('<auth-user-uuid>', 'you@engaz.com', 'Engaz Super Admin');
```

4. Copy env:

```bash
cp .env.example .env.local
# fill Engaz Supabase + ENGAZ_SECRETS_KEY + GITHUB_TOKEN + VERCEL_TOKEN
```

5. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

## Required platform env vars

| Variable                        | Purpose                                                 |
| ------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Engaz Admin Supabase URL                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Engaz Admin anon key                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Engaz Admin service role (server)                       |
| `ENGAZ_SECRETS_KEY`             | 32-byte base64 AES-256-GCM key for customer secrets     |
| `GITHUB_TOKEN`                  | PAT with repo contents on private `kamelfcis/QRScanner` |
| `GITHUB_REPO`                   | Default `kamelfcis/QRScanner`                           |
| `VERCEL_TOKEN`                  | Vercel API token                                        |
| `VERCEL_TEAM_ID`                | Optional team id                                        |

## Per-customer wizard inputs

- Template type
- Slug (branch name + `{slug}.vercel.app`)
- Arabic + English display names
- Customer Supabase: project ref, URL, anon key, service role, DB password, access token
- Optional admin email/password (auto-generated if omitted)

## Deploy Engaz Admin to Vercel

1. Ensure branch `engaz-admin` is pushed to `kamelfcis/QRScanner`.
2. Create Vercel project **`engazadmin`**:
   - Framework: Next.js
   - Production Branch: **`engaz-admin`**
   - Root directory: repo root
3. Set all platform env vars above in the Vercel project.
4. Deploy. Target URL: **`https://engazadmin.vercel.app`**.

### CLI sketch

```bash
npx vercel link --yes --project engazadmin
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# …add remaining env vars…
npx vercel --prod --yes
```

## Privacy checklist

1. Make **QRScanner private** on GitHub (Settings → Danger Zone / General visibility).
2. Engaz Admin Settings page warns if `private: false`.
3. Customer branches never receive Engaz Admin platform secrets.
4. `CUSTOMER_HANDOFF.md` on each customer branch contains that customer’s admin email/password + production URL — treat private repo as the boundary.

## Schema location

- Engaz Admin DB: `engaz-supabase/migrations/`
- Customer DB (applied by provisioner): `supabase/migrations/001`–`014`

## Out of scope (v1)

- Creating Supabase projects via API
- Custom domains beyond `{slug}.vercel.app`
- Billing / multi-org
- Editing customer menus from Engaz Admin
