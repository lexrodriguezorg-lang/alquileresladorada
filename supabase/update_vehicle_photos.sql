-- =====================================================================
-- UPDATE de fotos para los 5 vehículos demo ya existentes
-- Cópialo en SQL Editor de Supabase y ejecútalo.
-- =====================================================================
-- La columna `photos` es text[] (array). Cada vehículo recibe 1 URL
-- principal; puedes añadir más al array para tener galería:
--    array['url1', 'url2', 'url3']
-- =====================================================================

-- HKL12A · Bajaj Boxer CT 100  (commuter económica)
update public.vehicles
   set photos = array['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80']
 where plate = 'HKL12A';

-- JPR45B · AKT NKD 125  (naked pequeña)
update public.vehicles
   set photos = array['https://images.unsplash.com/photo-1547549082-6bc09f2049ae?auto=format&fit=crop&w=1200&q=80']
 where plate = 'JPR45B';

-- KMN78C · Yamaha FZ 2.0  (sport naked)
update public.vehicles
   set photos = array['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80']
 where plate = 'KMN78C';

-- LRT91D · Honda CB 160F  (street naked)
update public.vehicles
   set photos = array['https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80']
 where plate = 'LRT91D';

-- MSV34E · Suzuki V-Strom 250  (adventure / trail)
update public.vehicles
   set photos = array['https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?auto=format&fit=crop&w=1200&q=80']
 where plate = 'MSV34E';

-- Verificación
select plate, brand, model, photos[1] as foto_principal
  from public.vehicles
 where plate in ('HKL12A','JPR45B','KMN78C','LRT91D','MSV34E')
 order by plate;
