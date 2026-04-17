-- =====================================================================
-- Alquileres La Dorada - Esquema inicial de base de datos (Supabase)
-- Tablas: vehicles, clients, contracts, bookings, payments, alerts
-- =====================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Función auxiliar: actualiza automáticamente updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1. VEHICLES (Vehículos en alquiler)
-- =====================================================================
create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  plate           text not null unique,                      -- Placa
  brand           text not null,                             -- Marca
  model           text not null,                             -- Modelo
  year            int  check (year between 1950 and extract(year from now())::int + 1),
  color           text,
  vehicle_type    text not null default 'moto'
                  check (vehicle_type in ('moto','carro','camioneta','otro')),
  daily_rate      numeric(12,2) not null check (daily_rate >= 0),
  weekly_rate     numeric(12,2) check (weekly_rate >= 0),
  monthly_rate    numeric(12,2) check (monthly_rate >= 0),
  status          text not null default 'disponible'
                  check (status in ('disponible','alquilado','mantenimiento','inactivo')),
  mileage_km      int default 0 check (mileage_km >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists vehicles_type_idx   on public.vehicles (vehicle_type);

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 2. CLIENTS (Clientes)
-- =====================================================================
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  document_type   text not null default 'CC'
                  check (document_type in ('CC','CE','TI','PAS','NIT')),
  document_number text not null unique,                      -- Identificación
  full_name       text not null,
  phone           text,
  email           text,
  address         text,
  city            text default 'La Dorada',
  birth_date      date,
  license_number  text,                                      -- Licencia de conducción
  license_expiry  date,
  blacklisted     boolean not null default false,            -- Cliente vetado
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists clients_name_idx     on public.clients (full_name);
create index if not exists clients_document_idx on public.clients (document_number);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 3. CONTRACTS (Contratos de alquiler)
-- =====================================================================
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  contract_number text not null unique,                      -- Consecutivo del contrato
  client_id       uuid not null references public.clients(id)  on delete restrict,
  vehicle_id      uuid not null references public.vehicles(id) on delete restrict,
  start_date      date not null,
  end_date        date not null,
  rate_type       text not null default 'diaria'
                  check (rate_type in ('diaria','semanal','mensual')),
  rate_value      numeric(12,2) not null check (rate_value >= 0),
  deposit         numeric(12,2) default 0 check (deposit >= 0),
  total_amount    numeric(12,2) not null check (total_amount >= 0),
  status          text not null default 'activo'
                  check (status in ('borrador','activo','finalizado','cancelado','vencido')),
  signed_at       timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint contracts_dates_check check (end_date >= start_date)
);

create index if not exists contracts_client_idx  on public.contracts (client_id);
create index if not exists contracts_vehicle_idx on public.contracts (vehicle_id);
create index if not exists contracts_status_idx  on public.contracts (status);
create index if not exists contracts_dates_idx   on public.contracts (start_date, end_date);

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4. BOOKINGS (Reservas)
-- =====================================================================
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id)  on delete cascade,
  vehicle_id      uuid not null references public.vehicles(id) on delete restrict,
  contract_id     uuid references public.contracts(id) on delete set null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  status          text not null default 'pendiente'
                  check (status in ('pendiente','confirmada','cancelada','cumplida','no_show')),
  advance_amount  numeric(12,2) default 0 check (advance_amount >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint bookings_range_check check (end_at > start_at)
);

create index if not exists bookings_client_idx  on public.bookings (client_id);
create index if not exists bookings_vehicle_idx on public.bookings (vehicle_id);
create index if not exists bookings_status_idx  on public.bookings (status);
create index if not exists bookings_range_idx   on public.bookings (start_at, end_at);

drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 5. PAYMENTS (Pagos)
-- =====================================================================
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  contract_id     uuid references public.contracts(id) on delete cascade,
  booking_id      uuid references public.bookings(id)  on delete set null,
  client_id       uuid not null references public.clients(id) on delete restrict,
  amount          numeric(12,2) not null check (amount >= 0),
  payment_date    timestamptz not null default now(),
  method          text not null default 'efectivo'
                  check (method in ('efectivo','transferencia','nequi','daviplata','tarjeta','otro')),
  concept         text not null default 'alquiler'
                  check (concept in ('alquiler','deposito','multa','reparacion','otro')),
  reference       text,                                       -- Comprobante/Referencia externa
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint payments_target_check
    check (contract_id is not null or booking_id is not null)
);

create index if not exists payments_contract_idx on public.payments (contract_id);
create index if not exists payments_booking_idx  on public.payments (booking_id);
create index if not exists payments_client_idx   on public.payments (client_id);
create index if not exists payments_date_idx     on public.payments (payment_date);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 6. ALERTS (Alertas y notificaciones del sistema)
-- =====================================================================
create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  alert_type      text not null
                  check (alert_type in (
                    'contrato_vencido','contrato_por_vencer',
                    'pago_pendiente','mantenimiento','licencia_vencida',
                    'reserva_proxima','otro'
                  )),
  severity        text not null default 'media'
                  check (severity in ('baja','media','alta','critica')),
  title           text not null,
  message         text,
  vehicle_id      uuid references public.vehicles(id)  on delete cascade,
  client_id       uuid references public.clients(id)   on delete cascade,
  contract_id     uuid references public.contracts(id) on delete cascade,
  booking_id      uuid references public.bookings(id)  on delete cascade,
  is_read         boolean not null default false,
  resolved        boolean not null default false,
  due_at          timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists alerts_unresolved_idx on public.alerts (resolved) where resolved = false;
create index if not exists alerts_type_idx       on public.alerts (alert_type);
create index if not exists alerts_due_idx        on public.alerts (due_at);

drop trigger if exists trg_alerts_updated_at on public.alerts;
create trigger trg_alerts_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Row Level Security (habilitado; añadir políticas según roles)
-- =====================================================================
alter table public.vehicles  enable row level security;
alter table public.clients   enable row level security;
alter table public.contracts enable row level security;
alter table public.bookings  enable row level security;
alter table public.payments  enable row level security;
alter table public.alerts    enable row level security;

-- Política básica: usuarios autenticados tienen acceso completo.
-- Reemplaza por políticas más finas según roles (admin, operador, etc.).
do $$
declare
  t text;
begin
  foreach t in array array['vehicles','clients','contracts','bookings','payments','alerts']
  loop
    execute format($f$
      drop policy if exists "%1$s_auth_all" on public.%1$s;
      create policy "%1$s_auth_all" on public.%1$s
        for all
        to authenticated
        using (true)
        with check (true);
    $f$, t);
  end loop;
end $$;
