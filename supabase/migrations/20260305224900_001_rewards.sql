-- Valor baseline schema for submissions + rewards
-- Apply in Supabase SQL editor (or migration runner) before running the app.

create extension if not exists pgcrypto;

create table if not exists public.price_submissions (
  id uuid primary key default gen_random_uuid(),
  user_wallet_address text not null,
  gas_station_name text not null,
  gas_station_id text not null,
  gas_station_address text,
  price numeric(10, 3) not null,
  fuel_type text not null,
  currency text not null default 'USD',
  user_latitude numeric(10, 7) not null,
  user_longitude numeric(10, 7) not null,
  gas_station_latitude numeric(10, 7),
  gas_station_longitude numeric(10, 7),
  photo_url text,
  poi_place_id text,
  poi_name text,
  poi_lat numeric(10, 7),
  poi_long numeric(10, 7),
  poi_types text,
  reward_eligible boolean not null default false,
  reward_claimed boolean not null default false,
  reward_signature text,
  reward_tx_hash text,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_transactions (
  id bigserial primary key,
  submission_id text not null,
  user_wallet_address text not null,
  gas_station_id text not null,
  accrued_amount text not null,
  reward_period_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  payout_tx_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_price_submissions_station_created_at
  on public.price_submissions (gas_station_id, created_at desc);

create index if not exists idx_price_submissions_wallet_created_at
  on public.price_submissions (user_wallet_address, created_at desc);

create index if not exists idx_reward_transactions_wallet_paid
  on public.reward_transactions (user_wallet_address, paid);

create index if not exists idx_reward_transactions_date_paid
  on public.reward_transactions (reward_period_date, paid);

create unique index if not exists uq_submission_per_fuel_per_day
  on public.price_submissions (
    user_wallet_address,
    gas_station_id,
    fuel_type,
    ((created_at at time zone 'utc')::date)
  );
