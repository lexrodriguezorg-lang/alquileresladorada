-- =====================================================================
-- Acceso público + columnas extra para catálogo
-- =====================================================================

-- Columnas extra del vehículo para el catálogo público
alter table public.vehicles
  add column if not exists photos text[],
  add column if not exists engine_cc int;

-- ---------------------------------------------------------------------
-- Lectura pública del catálogo (anon)
-- ---------------------------------------------------------------------
drop policy if exists "vehicles_public_read" on public.vehicles;
create policy "vehicles_public_read" on public.vehicles
  for select to anon
  using (true);

-- ---------------------------------------------------------------------
-- RPC para solicitudes públicas de reserva
-- - upsert seguro de cliente por documento
-- - inserta booking con status 'pendiente'
-- - dispara alerta para el admin
-- - SECURITY DEFINER: el anon NO toca clients/bookings/alerts directamente
-- ---------------------------------------------------------------------
create or replace function public.submit_booking_request(
  p_full_name       text,
  p_document_number text,
  p_phone           text,
  p_email           text,
  p_vehicle_id      uuid,
  p_start_at        timestamptz,
  p_end_at          timestamptz,
  p_notes           text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id  uuid;
  v_booking_id uuid;
  v_vehicle    record;
begin
  if p_full_name is null or length(trim(p_full_name)) < 3 then
    raise exception 'Nombre inválido';
  end if;
  if p_document_number is null or length(trim(p_document_number)) < 3 then
    raise exception 'Documento inválido';
  end if;
  if p_end_at <= p_start_at then
    raise exception 'La fecha de fin debe ser posterior a la de inicio';
  end if;

  select id, brand, model, plate into v_vehicle
    from public.vehicles where id = p_vehicle_id;
  if v_vehicle.id is null then
    raise exception 'Vehículo no encontrado';
  end if;

  -- Cliente: buscar por documento o crear
  select id into v_client_id
    from public.clients
    where document_number = trim(p_document_number);

  if v_client_id is null then
    insert into public.clients
      (document_type, document_number, full_name, phone, email)
    values
      ('CC', trim(p_document_number), trim(p_full_name),
       nullif(trim(p_phone), ''), nullif(trim(p_email), ''))
    returning id into v_client_id;
  end if;

  -- Reserva
  insert into public.bookings
    (client_id, vehicle_id, start_at, end_at, status, notes)
  values
    (v_client_id, p_vehicle_id, p_start_at, p_end_at,
     'pendiente', nullif(trim(p_notes), ''))
  returning id into v_booking_id;

  -- Alerta para el admin
  insert into public.alerts
    (alert_type, severity, title, message,
     vehicle_id, client_id, booking_id, due_at)
  values
    ('reserva_proxima', 'alta',
     'Nueva solicitud de reserva',
     format('%s solicita el vehículo %s %s (placa %s) del %s al %s.',
            trim(p_full_name),
            v_vehicle.brand, v_vehicle.model, v_vehicle.plate,
            to_char(p_start_at, 'DD/MM/YYYY'),
            to_char(p_end_at,   'DD/MM/YYYY')),
     p_vehicle_id, v_client_id, v_booking_id, p_start_at);

  return v_booking_id;
end;
$$;

grant execute on function public.submit_booking_request(
  text, text, text, text, uuid, timestamptz, timestamptz, text
) to anon, authenticated;
