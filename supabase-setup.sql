-- Run this SQL in Supabase SQL Editor once.

create table if not exists public.menu_items (
  id bigint primary key,
  category text not null,
  name text not null,
  description text,
  price text,
  image text,
  badge text
);

create table if not exists public.store_settings (
  id int primary key,
  opening_days text,
  opening_hours text,
  phone text,
  address text,
  map_url text,
  instagram_handle text,
  instagram_url text,
  announcement text,
  logo_image text
);

insert into public.store_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.menu_items enable row level security;
alter table public.store_settings enable row level security;

-- Public read access for website.
create policy if not exists "menu_select_public"
on public.menu_items for select
using (true);

create policy if not exists "store_select_public"
on public.store_settings for select
using (true);

-- Public write access for admin panel using anon key.
-- If you need stricter security later, replace this with Supabase Auth.
create policy if not exists "menu_write_public"
on public.menu_items for all
using (true)
with check (true);

create policy if not exists "store_write_public"
on public.store_settings for all
using (true)
with check (true);

-- Storage bucket for uploaded images.
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy if not exists "assets_public_read"
on storage.objects for select
using (bucket_id = 'assets');

create policy if not exists "assets_public_write"
on storage.objects for insert
with check (bucket_id = 'assets');

create policy if not exists "assets_public_update"
on storage.objects for update
using (bucket_id = 'assets')
with check (bucket_id = 'assets');

create policy if not exists "assets_public_delete"
on storage.objects for delete
using (bucket_id = 'assets');
