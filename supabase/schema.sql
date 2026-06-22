-- ============================================================
-- INVESTMENT PORTFOLIO — Schema + RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── PROFILES ──────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);

-- Auto-create profile on new sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── ASSET CATEGORIES ─────────────────────────────────────
create table if not exists asset_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null default '#7c8cf8',
  created_at timestamptz not null default now()
);


-- ── ASSETS ───────────────────────────────────────────────
create type asset_type_enum as enum (
  'stock', 'etf', 'crypto', 'bond', 'real_estate', 'cash', 'other'
);

create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid references asset_categories(id) on delete set null,
  name        text not null,
  ticker      text,
  asset_type  asset_type_enum not null default 'other',
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);


-- ── TRANSACTIONS ─────────────────────────────────────────
create type transaction_type_enum as enum (
  'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'interest'
);

create table if not exists transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  asset_id         uuid references assets(id) on delete set null,
  transaction_type transaction_type_enum not null,
  quantity         numeric(18, 8),
  price_per_unit   numeric(18, 4),
  total_amount     numeric(18, 4) not null,
  fees             numeric(18, 4) not null default 0,
  notes            text,
  transaction_date date not null default current_date,
  created_at       timestamptz not null default now()
);


-- ── PRICE SNAPSHOTS (manual price log) ───────────────────
create table if not exists price_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  asset_id      uuid not null references assets(id) on delete cascade,
  price         numeric(18, 4) not null,
  snapshot_date date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (asset_id, snapshot_date)
);


-- ============================================================
-- ROW LEVEL SECURITY — Every user sees only their own data
-- ============================================================

alter table profiles          enable row level security;
alter table asset_categories  enable row level security;
alter table assets            enable row level security;
alter table transactions      enable row level security;
alter table price_snapshots   enable row level security;

-- profiles
create policy "profiles: own row" on profiles
  for all using (auth.uid() = id);

-- asset_categories
create policy "asset_categories: own rows" on asset_categories
  for all using (auth.uid() = user_id);

-- assets
create policy "assets: own rows" on assets
  for all using (auth.uid() = user_id);

-- transactions
create policy "transactions: own rows" on transactions
  for all using (auth.uid() = user_id);

-- price_snapshots
create policy "price_snapshots: own rows" on price_snapshots
  for all using (auth.uid() = user_id);


-- ============================================================
-- HELPER VIEW — Current holdings per asset
-- ============================================================
create or replace view holdings as
select
  t.user_id,
  t.asset_id,
  a.name,
  a.ticker,
  a.asset_type,
  a.currency,
  a.category_id,
  sum(case when t.transaction_type = 'buy'  then t.quantity else 0 end)
  - sum(case when t.transaction_type = 'sell' then t.quantity else 0 end)
    as quantity,
  sum(case when t.transaction_type = 'buy' then t.total_amount else 0 end)
  / nullif(
      sum(case when t.transaction_type = 'buy' then t.quantity else 0 end), 0
    )
    as avg_cost
from transactions t
join assets a on a.id = t.asset_id
group by t.user_id, t.asset_id, a.name, a.ticker, a.asset_type, a.currency, a.category_id;
