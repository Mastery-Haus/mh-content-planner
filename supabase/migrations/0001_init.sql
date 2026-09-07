-- Fase 1: modelo de datos base (brands + pieces)
-- Ver DECISIONS.md y CLAUDE.md para el contexto de estas decisiones.

create extension if not exists pgcrypto;

-- ---------- brands ----------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.brands (slug, name) values
  ('mastery-haus', 'Mastery Haus'),
  ('sofia-contreras', 'Sofia Contreras')
on conflict (slug) do nothing;

-- ---------- pieces ----------
-- Espejo de la pieza de contenido del JSON embebido en mockup.html, con brand_id
-- como scope de marca. platform/estado quedan como CHECK en vez de enum de Postgres
-- para poder agregar valores nuevos con un simple ALTER TABLE (sin ALTER TYPE).
create table if not exists public.pieces (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  date date not null,
  platform text not null check (platform in (
    'instagram', 'instagram_mh', 'facebook', 'linkedin', 'youtube', 'tiktok', 'email', 'newsletter'
  )),
  format text not null default '',
  angle text not null default '',
  copy text not null default '',
  material text not null default '',
  portada text not null default '',
  estado text not null default 'pendiente' check (estado in (
    'pendiente', 'produccion', 'listo', 'publicado', 'error'
  )),
  notas text not null default '',
  publicado text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pieces_brand_date_idx on public.pieces (brand_id, date);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pieces_set_updated_at on public.pieces;
create trigger pieces_set_updated_at
  before update on public.pieces
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- Auth simple (Decisión 4 en DECISIONS.md): cualquier usuario autenticado puede
-- leer las marcas y gestionar piezas de cualquier marca. Sin roles/permisos por
-- persona ni por marca en esta primera versión.
alter table public.brands enable row level security;
alter table public.pieces enable row level security;

drop policy if exists "Authenticated users can read brands" on public.brands;
create policy "Authenticated users can read brands" on public.brands
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage pieces" on public.pieces;
create policy "Authenticated users can manage pieces" on public.pieces
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
