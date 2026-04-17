-- =====================================================================
-- Columnas adicionales en vehicles: vencimientos, políticas específicas,
-- depósito específico y motor (litros) para carros.
-- =====================================================================

alter table public.vehicles
  add column if not exists soat_expiry           date,
  add column if not exists rtm_expiry            date,
  add column if not exists specific_deposit      numeric(12,2),
  add column if not exists requirements_specific text,
  add column if not exists zone_restrictions     text,
  add column if not exists engine_liters         numeric(4,2); -- para carros (ej: 1.60)

-- Índices para ordenar por vencimiento
create index if not exists vehicles_soat_expiry_idx on public.vehicles (soat_expiry);
create index if not exists vehicles_rtm_expiry_idx  on public.vehicles (rtm_expiry);
