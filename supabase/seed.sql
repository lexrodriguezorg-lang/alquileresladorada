-- =====================================================================
-- Alquileres La Dorada — Datos semilla
-- 5 vehículos · 3 clientes · 2 contratos activos · 2 alertas de ejemplo
-- =====================================================================
-- Idempotente: usa ON CONFLICT para evitar duplicados al re-ejecutar.

-- ---------------------------------------------------------------------
-- 1. VEHÍCULOS (flota de David)
-- ---------------------------------------------------------------------
insert into public.vehicles
  (plate, brand, model, year, color, vehicle_type, daily_rate, weekly_rate, monthly_rate, status, mileage_km, notes)
values
  ('HKL12A', 'Bajaj',   'Boxer CT 100',     2021, 'Negro',  'moto', 26000,  150000,  550000,  'disponible',    18500, 'Flota David — económica, bajo consumo'),
  ('JPR45B', 'AKT',     'NKD 125',          2022, 'Rojo',   'moto', 35000,  210000,  780000,  'alquilado',     12300, 'Flota David'),
  ('KMN78C', 'Yamaha',  'FZ 2.0',           2023, 'Azul',   'moto', 55000,  330000, 1200000,  'disponible',     6400, 'Flota David — mantenimiento al día'),
  ('LRT91D', 'Honda',   'CB 160F',          2023, 'Blanco', 'moto', 75000,  450000, 1650000,  'alquilado',      4100, 'Flota David — premium'),
  ('MSV34E', 'Suzuki',  'V-Strom 250',      2024, 'Gris',   'moto', 150000, 900000, 3300000,  'mantenimiento',  9800, 'Flota David — trail, uso intensivo')
on conflict (plate) do nothing;

-- ---------------------------------------------------------------------
-- 2. CLIENTES
-- ---------------------------------------------------------------------
insert into public.clients
  (document_type, document_number, full_name, phone, email, address, city, license_number, license_expiry, blacklisted)
values
  ('CC', '1085294736', 'Juan Camilo Ramírez Ospina',  '3114567890', 'jcramirez@example.com', 'Cra 5 # 12-34',   'La Dorada', 'A2-10852947', '2027-08-15', false),
  ('CC', '1002938475', 'María Fernanda Gómez Castro', '3208765432', 'mfgomez@example.com',   'Cll 18 # 7-21',   'La Dorada', 'A2-10029384', '2026-11-30', false),
  ('CE', '523849',     'Carlos Andrés Pérez Vargas',  '3152345678', 'caperez@example.com',   'Cra 10 # 22-05',  'La Dorada', 'A2-0523849',  '2028-03-10', false)
on conflict (document_number) do nothing;

-- ---------------------------------------------------------------------
-- 3. CONTRATOS ACTIVOS (referencia por placa/documento vía subquery)
-- ---------------------------------------------------------------------
-- Contrato 1: María Fernanda — AKT NKD 125 (tarifa diaria, 15 días)
insert into public.contracts
  (contract_number, client_id, vehicle_id, start_date, end_date, rate_type, rate_value, deposit, total_amount, status, signed_at, notes)
select
  'C-2026-0001',
  (select id from public.clients  where document_number = '1002938475'),
  (select id from public.vehicles where plate = 'JPR45B'),
  current_date - interval '5 days',
  current_date + interval '10 days',
  'diaria',
  35000,
  100000,
  35000 * 15,
  'activo',
  now() - interval '5 days',
  'Contrato de prueba generado por semilla'
on conflict (contract_number) do nothing;

-- Contrato 2: Juan Camilo — Honda CB 160F (tarifa semanal, 4 semanas)
insert into public.contracts
  (contract_number, client_id, vehicle_id, start_date, end_date, rate_type, rate_value, deposit, total_amount, status, signed_at, notes)
select
  'C-2026-0002',
  (select id from public.clients  where document_number = '1085294736'),
  (select id from public.vehicles where plate = 'LRT91D'),
  current_date - interval '10 days',
  current_date + interval '18 days',
  'semanal',
  450000,
  200000,
  450000 * 4,
  'activo',
  now() - interval '10 days',
  'Contrato de prueba generado por semilla'
on conflict (contract_number) do nothing;

-- ---------------------------------------------------------------------
-- 4. ALERTAS (SOAT / RTM) para ver datos en el Dashboard
-- ---------------------------------------------------------------------
insert into public.alerts
  (alert_type, severity, title, message, vehicle_id, due_at, resolved)
select
  'mantenimiento',
  'alta',
  'SOAT próximo a vencer',
  'El SOAT del vehículo HKL12A vence pronto. Renovar antes del viaje.',
  (select id from public.vehicles where plate = 'HKL12A'),
  (current_date + interval '15 days')::timestamptz,
  false
where not exists (
  select 1 from public.alerts
  where title = 'SOAT próximo a vencer'
    and vehicle_id = (select id from public.vehicles where plate = 'HKL12A')
);

insert into public.alerts
  (alert_type, severity, title, message, vehicle_id, due_at, resolved)
select
  'mantenimiento',
  'critica',
  'RTM vencida',
  'La Revisión Técnico-Mecánica del vehículo MSV34E está vencida.',
  (select id from public.vehicles where plate = 'MSV34E'),
  (current_date - interval '3 days')::timestamptz,
  false
where not exists (
  select 1 from public.alerts
  where title = 'RTM vencida'
    and vehicle_id = (select id from public.vehicles where plate = 'MSV34E')
);
