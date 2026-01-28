-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  language_preference text default 'en',

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Handle User Signups
-- This triggers a profile creation when a user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- FARMS Table
create table farms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  farm_code text,
  area_hectares numeric,
  address text,
  longitude numeric,
  latitude numeric,
  qr_code_url text,
  privacy_setting text default 'private' check (privacy_setting in ('private', 'public', 'shared'))
);

alter table farms enable row level security;

create policy "Users can view their own farms."
  on farms for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own farms."
  on farms for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own farms."
  on farms for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own farms."
  on farms for delete
  using ( auth.uid() = user_id );


-- PONDS Table
create table ponds (
  id uuid default gen_random_uuid() primary key,
  farm_id uuid references farms(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  pond_code text,
  area_m2 numeric,
  depth_m numeric,
  species_type text,
  stocking_date timestamp with time zone,
  status text default 'active' check (status in ('active', 'inactive', 'in_use'))
);

alter table ponds enable row level security;

-- Ponds are accessible if the user owns the parent farm
create policy "Users can view ponds of their farms."
  on ponds for select
  using ( exists ( select 1 from farms where farms.id = ponds.farm_id and farms.user_id = auth.uid() ) );

create policy "Users can insert ponds to their farms."
  on ponds for insert
  with check ( exists ( select 1 from farms where farms.id = ponds.farm_id and farms.user_id = auth.uid() ) );

create policy "Users can update ponds of their farms."
  on ponds for update
  using ( exists ( select 1 from farms where farms.id = ponds.farm_id and farms.user_id = auth.uid() ) );

create policy "Users can delete ponds of their farms."
  on ponds for delete
  using ( exists ( select 1 from farms where farms.id = ponds.farm_id and farms.user_id = auth.uid() ) );


-- SIMULATIONS Table
create table simulations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  pond_id uuid references public.ponds(id),
  scenario_type text,
  input_feed_price numeric,
  input_growth_rate numeric,
  input_selling_price numeric,
  input_stocking_density numeric,
  result_projected_biomass numeric,
  result_projected_fcr numeric,
  result_total_revenue numeric,
  result_total_cost numeric,
  result_net_profit numeric,
  result_profit_diff numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table simulations enable row level security;

create policy "Users can view simulations for their ponds."
  on simulations for select
  using ( exists (
    select 1 from ponds
    join farms on farms.id = ponds.farm_id
    where ponds.id = simulations.pond_id and farms.user_id = auth.uid()
  ) );

create policy "Users can insert simulations for their ponds."
  on simulations for insert
  with check ( exists (
    select 1 from ponds
    join farms on farms.id = ponds.farm_id
    where ponds.id = simulations.pond_id and farms.user_id = auth.uid()
  ) );


-- HARVEST PLANS Table
create table harvest_plans (
  id uuid default gen_random_uuid() primary key,
  pond_id uuid references public.ponds(id),
  crop_id uuid references public.crops(id),
  planned_harvest_date timestamp with time zone,
  target_weight_kg numeric,
  expected_price_per_kg numeric,
  expected_revenue numeric,
  actual_harvest_date timestamp with time zone,
  actual_weight_kg numeric,
  actual_price_per_kg numeric,
  actual_revenue numeric,
  notes text,
  status text default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table harvest_plans enable row level security;

create policy "Users can view harvest plans for their ponds."
  on harvest_plans for select
  using ( exists (
    select 1 from ponds
    join farms on farms.id = ponds.farm_id
    where ponds.id = harvest_plans.pond_id and farms.user_id = auth.uid()
  ) );

create policy "Users can insert harvest plans for their ponds."
  on harvest_plans for insert
  with check ( exists (
    select 1 from ponds
    join farms on farms.id = ponds.farm_id
    where ponds.id = harvest_plans.pond_id and farms.user_id = auth.uid()
  ) );

create policy "Users can update harvest plans for their ponds."
  on harvest_plans for update
  using ( exists (
    select 1 from ponds
    join farms on farms.id = ponds.farm_id
    where ponds.id = harvest_plans.pond_id and farms.user_id = auth.uid()
  ) );


-- OTP CODES Table
create table otp_codes (
  id uuid default gen_random_uuid() primary key,
  email text,
  phone text,
  code text not null,
  expires_at timestamp with time zone not null,
  verified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table otp_codes enable row level security;

create policy "Service can manage otp codes"
  on otp_codes for all
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );
