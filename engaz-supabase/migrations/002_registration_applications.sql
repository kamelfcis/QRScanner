-- Engaz Admin: self-service registration applications
-- Apply only to the Engaz Admin database (zvngjznpvibciituiced), never to customer projects.
-- Extends public.customers; does not recreate tables.

-- ============================================================
-- CUSTOMERS: application fields
-- ============================================================
alter table public.customers
  add column if not exists owner_name text,
  add column if not exists owner_email text,
  add column if not exists owner_phone text,
  add column if not exists business_type text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists logo_path text,
  add column if not exists menu_path text,
  add column if not exists registration_source text not null default 'admin',
  add column if not exists onboarding_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_business_type_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_business_type_check
      check (
        business_type is null
        or business_type in (
          'restaurant',
          'cafe',
          'bakery',
          'fast_food',
          'cloud_kitchen',
          'other'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_registration_source_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_registration_source_check
      check (registration_source in ('admin', 'self_service'));
  end if;
end $$;

-- Lookups used by landing register + admin "New applications" filter
create index if not exists customers_owner_email_idx
  on public.customers (owner_email);

create unique index if not exists customers_owner_email_unique_idx
  on public.customers (lower(owner_email))
  where owner_email is not null;

create index if not exists customers_registration_source_idx
  on public.customers (registration_source);

create index if not exists customers_self_service_drafts_idx
  on public.customers (created_at desc)
  where registration_source = 'self_service' and status = 'draft';

-- Anon must not write customers. Authenticated super-admins keep existing SELECT/INSERT/UPDATE.
-- Landing writes exclusively via service_role (bypasses RLS). No new anon policies.

revoke insert, update, delete on public.customers from anon;
revoke insert, update, delete on public.customer_admins from anon;

-- ============================================================
-- STORAGE: registration logos (public) + menus (private)
-- Uploads are service_role only (no anon/authenticated insert policies).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'registration-logos',
    'registration-logos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'registration-menus',
    'registration-menus',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "registration_logos_public_select" on storage.objects;
create policy "registration_logos_public_select"
  on storage.objects
  for select
  to public
  using (bucket_id = 'registration-logos');

drop policy if exists "registration_menus_super_admin_select" on storage.objects;
create policy "registration_menus_super_admin_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'registration-menus'
    and exists (
      select 1
      from public.super_admins sa
      where sa.user_id = (select auth.uid())
    )
  );
