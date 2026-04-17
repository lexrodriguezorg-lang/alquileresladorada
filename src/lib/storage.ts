import { supabase } from './supabase'

export const VEHICLE_PHOTO_BUCKET = 'vehicle-photos'

export const VEHICLE_PHOTO_SLOTS = [
  'front',
  'right',
  'left',
  'rear',
  'dashboard',
] as const
export type VehicleSlot = (typeof VEHICLE_PHOTO_SLOTS)[number]

export const SLOT_INDEX: Record<VehicleSlot, number> = {
  front: 0,
  right: 1,
  left: 2,
  rear: 3,
  dashboard: 4,
}

export const SLOT_LABEL: Record<VehicleSlot, string> = {
  front: 'Frente',
  right: 'Lateral derecho',
  left: 'Lateral izquierdo',
  rear: 'Trasera',
  dashboard: 'Tablero',
}

/**
 * Sube la foto de un slot concreto y devuelve la URL pública.
 * Reemplaza el archivo si ya existe en ese slot.
 */
export async function uploadVehicleSlotPhoto(
  vehicleId: string,
  slot: VehicleSlot,
  file: File
): Promise<string> {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  // Path determinístico por slot: re-upload sobrescribe.
  const path = `vehicles/${vehicleId}/${slot}.${ext}`

  // Borra cualquier archivo previo para ese slot (otras extensiones).
  const { data: existing } = await supabase.storage
    .from(VEHICLE_PHOTO_BUCKET)
    .list(`vehicles/${vehicleId}`, { limit: 20 })
  const toRemove =
    existing
      ?.filter(
        (o) => o.name.startsWith(slot + '.') && o.name !== `${slot}.${ext}`
      )
      .map((o) => `vehicles/${vehicleId}/${o.name}`) ?? []
  if (toRemove.length) {
    await supabase.storage.from(VEHICLE_PHOTO_BUCKET).remove(toRemove)
  }

  const { error } = await supabase.storage
    .from(VEHICLE_PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error

  const { data } = supabase.storage
    .from(VEHICLE_PHOTO_BUCKET)
    .getPublicUrl(path)
  // Cache-buster para que el navegador tome la nueva versión al reemplazar
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function deleteVehicleSlotPhoto(
  vehicleId: string,
  slot: VehicleSlot
) {
  const { data: existing } = await supabase.storage
    .from(VEHICLE_PHOTO_BUCKET)
    .list(`vehicles/${vehicleId}`, { limit: 20 })
  const toRemove =
    existing
      ?.filter((o) => o.name.startsWith(slot + '.'))
      .map((o) => `vehicles/${vehicleId}/${o.name}`) ?? []
  if (toRemove.length) {
    await supabase.storage.from(VEHICLE_PHOTO_BUCKET).remove(toRemove)
  }
}

/**
 * Actualiza vehicles.photos posicional (length=5) tras un upload/delete.
 * [0]=front, [1]=right, [2]=left, [3]=rear, [4]=dashboard
 */
export function setSlotInPhotos(
  photos: string[] | null | undefined,
  slot: VehicleSlot,
  url: string | null
): string[] {
  const out = [...(photos ?? [])]
  while (out.length < 5) out.push('')
  out[SLOT_INDEX[slot]] = url ?? ''
  return out
}

export function photoFromSlot(
  photos: string[] | null | undefined,
  slot: VehicleSlot
): string | null {
  const arr = photos ?? []
  const url = arr[SLOT_INDEX[slot]]
  return url && url !== '' ? url : null
}
