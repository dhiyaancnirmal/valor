-- M2 POI domain: community POIs + proposals

create table if not exists public.pois (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  categories text[] not null,
  primary_category text not null check (primary_category in ('gas_station', 'grocery_store')),
  status text not null default 'published' check (status in ('published', 'rejected')),
  source text not null default 'community',
  created_by_wallet text not null,
  proposal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poi_proposals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  categories text[] not null,
  primary_category text not null check (primary_category in ('gas_station', 'grocery_store')),
  notes text,
  created_by_wallet text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  resolution_reason text,
  published_poi_id uuid,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pois_proposal_fk'
  ) then
    alter table public.pois
      add constraint pois_proposal_fk
      foreign key (proposal_id)
      references public.poi_proposals (id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'poi_proposals_published_poi_fk'
  ) then
    alter table public.poi_proposals
      add constraint poi_proposals_published_poi_fk
      foreign key (published_poi_id)
      references public.pois (id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_pois_status_category on public.pois (status, primary_category);
create index if not exists idx_pois_created_wallet on public.pois (created_by_wallet, created_at desc);
create index if not exists idx_pois_lat_lng on public.pois (latitude, longitude);
create index if not exists idx_pois_categories_gin on public.pois using gin (categories);
create index if not exists idx_poi_proposals_created_wallet on public.poi_proposals (created_by_wallet, created_at desc);
create index if not exists idx_poi_proposals_status on public.poi_proposals (status, created_at desc);
create index if not exists idx_poi_proposals_lat_lng on public.poi_proposals (latitude, longitude);
create index if not exists idx_poi_proposals_categories_gin on public.poi_proposals using gin (categories);

create unique index if not exists uq_pois_normalized_name_primary_lat_lng
  on public.pois (
    normalized_name,
    primary_category,
    round((latitude::numeric), 4),
    round((longitude::numeric), 4)
  );
