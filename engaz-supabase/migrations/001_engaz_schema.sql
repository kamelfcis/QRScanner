-- Engaz Admin control-plane schema (dedicated Supabase project)
-- Apply only to the Engaz Admin database, never to customer projects.

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type public.customer_template_type as enum ('warda', 'aklet', 'harameen');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.customer_status as enum (
    'draft',
    'provisioning',
    'live',
    'failed',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.provision_job_status as enum (
    'queued',
    'cloning',
    'migrating',
    'seeding',
    'creating_admin',
    'configuring_git',
    'deploying',
    'done',
    'failed'
  );
exception when duplicate_object then null;
end $$;

-- ============================================================
-- SUPER ADMINS
-- ============================================================
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.super_admins enable row level security;

create policy "super_admins_select_self"
  on public.super_admins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name_ar text not null,
  display_name_en text not null,
  template_type public.customer_template_type not null,
  git_branch text,
  vercel_project_id text,
  production_url text,
  supabase_project_ref text,
  status public.customer_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

create index if not exists customers_status_idx on public.customers (status);
create index if not exists customers_created_at_idx on public.customers (created_at desc);

alter table public.customers enable row level security;

create policy "customers_select_super_admin"
  on public.customers for select to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

create policy "customers_insert_super_admin"
  on public.customers for insert to authenticated
  with check (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

create policy "customers_update_super_admin"
  on public.customers for update to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

-- ============================================================
-- CUSTOMER SECRETS (encrypted blobs; service role only)
-- ============================================================
create table if not exists public.customer_secrets (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_secrets enable row level security;
-- No policies: only service_role (bypasses RLS) may read/write secrets.

-- ============================================================
-- CUSTOMER ADMINS (dashboard creds; password encrypted)
-- ============================================================
create table if not exists public.customer_admins (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  email text not null,
  password_ciphertext text not null,
  password_iv text not null,
  password_auth_tag text not null,
  supabase_user_id uuid,
  created_at timestamptz not null default now(),
  unique (customer_id, email)
);

alter table public.customer_admins enable row level security;

create policy "customer_admins_select_super_admin"
  on public.customer_admins for select to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

-- Inserts/updates via service role only (no insert/update policies for authenticated)

-- ============================================================
-- PROVISION JOBS
-- ============================================================
create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  status public.provision_job_status not null default 'queued',
  current_step text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provision_jobs_customer_idx on public.provision_jobs (customer_id, created_at desc);
create index if not exists provision_jobs_status_idx on public.provision_jobs (status);

alter table public.provision_jobs enable row level security;

create policy "provision_jobs_select_super_admin"
  on public.provision_jobs for select to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

-- ============================================================
-- PROVISION JOB EVENTS (timeline)
-- ============================================================
create table if not exists public.provision_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.provision_jobs (id) on delete cascade,
  step text not null,
  level text not null default 'info' check (level in ('info', 'warn', 'error', 'success')),
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provision_job_events_job_idx
  on public.provision_job_events (job_id, created_at);

alter table public.provision_job_events enable row level security;

create policy "provision_job_events_select_super_admin"
  on public.provision_job_events for select to authenticated
  using (exists (select 1 from public.super_admins sa where sa.user_id = (select auth.uid())));

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.super_admins sa where sa.user_id = (select auth.uid())
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists provision_jobs_set_updated_at on public.provision_jobs;
create trigger provision_jobs_set_updated_at
  before update on public.provision_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists customer_secrets_set_updated_at on public.customer_secrets;
create trigger customer_secrets_set_updated_at
  before update on public.customer_secrets
  for each row execute function public.set_updated_at();

-- Grant Data API access (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select on public.super_admins to authenticated;
grant select, insert, update on public.customers to authenticated;
grant select on public.customer_admins to authenticated;
grant select on public.provision_jobs to authenticated;
grant select on public.provision_job_events to authenticated;

-- ============================================================
-- NOTE: First super-admin
-- After creating the Auth user in Engaz Admin Supabase, insert:
--   insert into public.super_admins (user_id, email, display_name)
--   values ('<auth-user-uuid>', 'you@engaz.com', 'Engaz Super Admin');
-- Or use engaz-supabase/seed_super_admin.sql with service role.
-- ============================================================
