-- RIZKY STORE — Supabase production database
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price bigint not null default 0 check (price >= 0),
  category text not null default 'Digital',
  description text default '',
  badge text default '',
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists image_url text not null default '';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  customer_name text not null,
  customer_phone text not null,
  payment_method text not null,
  total bigint not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending','paid','processing','completed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  message text not null,
  image_url text not null default '',
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.testimonials add column if not exists image_url text not null default '';

create table if not exists public.store_settings (
  id boolean primary key default true,
  store_name text not null default 'Rizky Store',
  whatsapp text not null default '6285797103586',
  qr_data text default 'assets/qris-rizky-store.jpg',
  dana_number text not null default '085797103586',
  dana_name text not null default 'AN/RA**I',
  region text not null default 'Banyumas',
  updated_at timestamptz not null default now()
);

alter table public.store_settings add column if not exists dana_number text not null default '085797103586';
alter table public.store_settings add column if not exists dana_name text not null default 'AN/RA**I';
alter table public.store_settings add column if not exists region text not null default 'Banyumas';

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.store_settings (id, store_name, whatsapp, qr_data, dana_number, dana_name, region)
values (true, 'Rizky Store', '6285797103586', 'assets/qris-rizky-store.jpg', '085797103586', 'AN/RA**I', 'Banyumas')
on conflict (id) do update set
  whatsapp=excluded.whatsapp,
  dana_number=excluded.dana_number,
  dana_name=excluded.dana_name,
  region=excluded.region;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.testimonials enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select to anon, authenticated using (is_active = true or public.is_admin());
drop policy if exists "admins insert products" on public.products;
create policy "admins insert products" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "admins update products" on public.products;
create policy "admins update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete products" on public.products;
create policy "admins delete products" on public.products for delete to authenticated using (public.is_admin());

drop policy if exists "public create orders" on public.orders;
create policy "public create orders" on public.orders for insert to anon, authenticated with check (status = 'pending');
drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read visible testimonials" on public.testimonials;
create policy "public read visible testimonials" on public.testimonials for select to anon, authenticated using (is_visible = true or public.is_admin());
drop policy if exists "public create testimonials" on public.testimonials;
create policy "public create testimonials" on public.testimonials for insert to anon, authenticated with check (rating between 1 and 5 and is_visible = true);
drop policy if exists "admins update testimonials" on public.testimonials;
create policy "admins update testimonials" on public.testimonials for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete testimonials" on public.testimonials;
create policy "admins delete testimonials" on public.testimonials for delete to authenticated using (public.is_admin());

drop policy if exists "public read store settings" on public.store_settings;
create policy "public read store settings" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "admins update store settings" on public.store_settings;
create policy "admins update store settings" on public.store_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read admin_users" on public.admin_users;
create policy "admins read admin_users" on public.admin_users for select to authenticated using (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant select on public.testimonials to anon, authenticated;
grant insert on public.testimonials to anon, authenticated;
grant update, delete on public.testimonials to authenticated;
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;
grant select on public.admin_users to authenticated;

-- Storage bucket for product photos: public read, admin-only write/delete, max 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-assets', 'payment-assets', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('testimonial-images', 'testimonial-images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=10485760, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "public read testimonial images" on storage.objects;
create policy "public read testimonial images" on storage.objects for select to anon, authenticated using (bucket_id = 'testimonial-images');
drop policy if exists "public upload testimonial images" on storage.objects;
create policy "public upload testimonial images" on storage.objects for insert to anon, authenticated with check (bucket_id = 'testimonial-images');
drop policy if exists "admins update testimonial images" on storage.objects;
create policy "admins update testimonial images" on storage.objects for update to authenticated using (bucket_id = 'testimonial-images' and public.is_admin()) with check (bucket_id = 'testimonial-images' and public.is_admin());
drop policy if exists "admins delete testimonial images" on storage.objects;
create policy "admins delete testimonial images" on storage.objects for delete to authenticated using (bucket_id = 'testimonial-images' and public.is_admin());

drop policy if exists "public read payment assets" on storage.objects;
create policy "public read payment assets" on storage.objects for select to anon, authenticated using (bucket_id = 'payment-assets');
drop policy if exists "admins upload payment assets" on storage.objects;
create policy "admins upload payment assets" on storage.objects for insert to authenticated with check (bucket_id = 'payment-assets' and public.is_admin());
drop policy if exists "admins update payment assets" on storage.objects;
create policy "admins update payment assets" on storage.objects for update to authenticated using (bucket_id = 'payment-assets' and public.is_admin()) with check (bucket_id = 'payment-assets' and public.is_admin());
drop policy if exists "admins delete payment assets" on storage.objects;
create policy "admins delete payment assets" on storage.objects for delete to authenticated using (bucket_id = 'payment-assets' and public.is_admin());

-- Optional starter products are intentionally omitted. Admin can add products with required photos.
