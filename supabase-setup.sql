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

-- Seed default store details.
insert into public.store_settings (
  id,
  opening_days,
  opening_hours,
  phone,
  address,
  map_url,
  instagram_handle,
  instagram_url,
  announcement,
  logo_image
)
values (
  1,
  'Every Day',
  '5:00 PM - 2:00 AM',
  '+94 70 392 3931',
  'Sri Lanka',
  'https://maps.app.goo.gl/CTwFqKEPF2g95mrE9',
  '@ceylon_chaii',
  'https://www.instagram.com/ceylon_chaii',
  'Weekend offer: 10% off selected tea and food combos.',
  'images/logo.svg'
)
on conflict (id) do update
set
  opening_days = excluded.opening_days,
  opening_hours = excluded.opening_hours,
  phone = excluded.phone,
  address = excluded.address,
  map_url = excluded.map_url,
  instagram_handle = excluded.instagram_handle,
  instagram_url = excluded.instagram_url,
  announcement = excluded.announcement,
  logo_image = excluded.logo_image;

-- Seed default menu items.
insert into public.menu_items (id, category, name, description, price, image, badge)
values
  (1, 'tea', 'Baathaam Tea', 'Rich aromatic tea with traditional spices and herbs', 'Rs. 250', 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500', 'Popular'),
  (2, 'tea', 'Masala Chai', 'Authentic spiced tea with cardamom, ginger, and cloves', 'Rs. 280', 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=500', 'Hot'),
  (3, 'tea', 'Milk Tea', 'Creamy milk tea with perfect sweetness', 'Rs. 200', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500', 'Bestseller'),
  (4, 'food', 'Chicken Shawarma', 'Tender marinated chicken with fresh vegetables and special sauce', 'Rs. 450', 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=500', 'Signature'),
  (5, 'food', 'Beef Burger', 'Juicy beef patty with cheese, lettuce, and our special sauce', 'Rs. 550', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', 'New'),
  (6, 'food', 'Submarine', 'Loaded submarine with chicken, vegetables, and sauces', 'Rs. 400', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500', 'Popular'),
  (7, 'drinks', 'Mango Mojito', 'Refreshing mango mojito with fresh mint and lime', 'Rs. 350', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500', 'Refreshing'),
  (8, 'drinks', 'Fresh Juice', 'Seasonal fresh fruit juice packed with vitamins', 'Rs. 300', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500', 'Healthy'),
  (9, 'food', 'Buns', 'Soft freshly baked buns with various fillings', 'Rs. 150', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500', 'Fresh')
on conflict (id) do update
set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image = excluded.image,
  badge = excluded.badge;

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
