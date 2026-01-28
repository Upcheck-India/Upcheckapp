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
