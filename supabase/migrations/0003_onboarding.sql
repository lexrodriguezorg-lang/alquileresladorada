-- =====================================================================
-- Onboarding wizard + Storage para fotos de vehículos
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla business_config (singleton lógico: se usa la fila más reciente)
-- ---------------------------------------------------------------------
create table if not exists public.business_config (
  id                    uuid primary key default gen_random_uuid(),

  -- Paso 1: Datos del negocio
  business_name         text,
  business_address      text,
  business_city         text,
  schedule_text         text,
  phone_primary         text,
  phone_secondary       text,
  whatsapp              text,
  email                 text,
  social                jsonb not null default '{}'::jsonb,
  -- social: { instagram?, facebook?, tiktok? }

  -- Paso 2: Políticas del negocio
  policies              jsonb not null default '{}'::jsonb,
  -- policies: {
  --   requirements: text[]     (lista requisitos)
  --   deposit_amount: number   (depósito base)
  --   deposit_note: text       (detalles depósito)
  --   zones: text              (zonas permitidas)
  --   fuel_policy: text        (combustible)
  --   mileage_policy: text     (kilometraje)
  --   cancellation_policy: text
  -- }

  -- Paso 3: Métodos de pago
  payment_methods       jsonb not null default '[]'::jsonb,
  -- payment_methods: [
  --   { type: 'nequi'|'daviplata'|'bancolombia'|'efectivo'|'otro',
  --     label: text, number: text, holder?: text }
  -- ]

  -- Estado del onboarding
  onboarding_step       int  not null default 1 check (onboarding_step between 1 and 5),
  onboarding_completed  boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_business_config_updated_at on public.business_config;
create trigger trg_business_config_updated_at
  before update on public.business_config
  for each row execute function public.set_updated_at();

-- RLS
alter table public.business_config enable row level security;

drop policy if exists "business_config_auth_all" on public.business_config;
create policy "business_config_auth_all" on public.business_config
  for all to authenticated
  using (true) with check (true);

-- Lectura pública para que la landing muestre datos del negocio
drop policy if exists "business_config_public_read" on public.business_config;
create policy "business_config_public_read" on public.business_config
  for select to anon using (true);

-- ---------------------------------------------------------------------
-- Storage bucket para fotos de vehículos (5 por vehículo)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do update set public = true;

-- Políticas de storage
drop policy if exists "vehicle_photos_public_read"  on storage.objects;
create policy "vehicle_photos_public_read" on storage.objects
  for select using (bucket_id = 'vehicle-photos');

drop policy if exists "vehicle_photos_auth_insert"  on storage.objects;
create policy "vehicle_photos_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-photos');

drop policy if exists "vehicle_photos_auth_update"  on storage.objects;
create policy "vehicle_photos_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-photos');

drop policy if exists "vehicle_photos_auth_delete"  on storage.objects;
create policy "vehicle_photos_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-photos');
