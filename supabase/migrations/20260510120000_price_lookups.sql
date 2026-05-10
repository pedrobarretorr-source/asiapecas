-- Tabela: price_lookups (1 row por busca disparada)
create table public.price_lookups (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_price_lookups_part_created on public.price_lookups(part_id, created_at desc);

-- Tabela: price_lookup_results (N rows por lookup)
create table public.price_lookup_results (
  id uuid primary key default gen_random_uuid(),
  lookup_id uuid not null references public.price_lookups(id) on delete cascade,
  source text not null check (source in ('mercadolivre', 'lideranca', 'macromaq', 'extramaquinas')),
  rank int not null default 0,
  title text,
  price_brl numeric(12, 2),
  url text,
  seller text,
  image_url text,
  in_stock boolean,
  error text
);
create index idx_price_lookup_results_lookup on public.price_lookup_results(lookup_id);

-- RLS
alter table public.price_lookups enable row level security;
alter table public.price_lookup_results enable row level security;

create policy "auth read price_lookups"
  on public.price_lookups for select
  to authenticated using (true);

create policy "auth insert price_lookups"
  on public.price_lookups for insert
  to authenticated with check (true);

create policy "auth delete price_lookups"
  on public.price_lookups for delete
  to authenticated using (true);

create policy "auth read price_lookup_results"
  on public.price_lookup_results for select
  to authenticated using (true);

create policy "auth insert price_lookup_results"
  on public.price_lookup_results for insert
  to authenticated with check (true);
