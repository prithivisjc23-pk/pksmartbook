create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  shop_name text,
  phone text,
  language text not null default 'en',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own profile read" on public.profiles for select to authenticated using (auth.uid()=id or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid()=id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, shop_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'shop_name');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text,
  pending_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('sale','expense')),
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  category text,
  customer_id uuid references public.customers(id) on delete set null,
  txn_date date not null default current_date,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.customers, public.products, public.transactions to authenticated;
grant all on public.customers, public.products, public.transactions to service_role;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;

create policy "own or admin read" on public.customers for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "own write" on public.customers for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own or admin read" on public.products for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "own write" on public.products for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own or admin read" on public.transactions for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "own write" on public.transactions for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);