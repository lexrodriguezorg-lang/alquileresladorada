import type { VehicleType } from './database.types'

/**
 * Devuelve la primera foto disponible, o un placeholder SVG data-URL según
 * el tipo de vehículo. Sin dependencias externas.
 */
export function vehiclePhoto(
  photos: string[] | null | undefined,
  type: VehicleType
): string {
  const first = (photos ?? []).find((p) => !!p && p.trim() !== '')
  if (first) return first
  return placeholderByType(type)
}

export function vehicleGallery(
  photos: string[] | null | undefined,
  type: VehicleType
): string[] {
  const valid = (photos ?? []).filter((p) => !!p && p.trim() !== '')
  if (valid.length > 0) return valid
  return [placeholderByType(type)]
}

function placeholderByType(type: VehicleType): string {
  const icon =
    type === 'moto'
      ? // Ícono moto
        `<path d="M40 110h80M50 110a15 15 0 1 1-30 0 15 15 0 0 1 30 0Zm130 0a15 15 0 1 1-30 0 15 15 0 0 1 30 0Z" fill="none" stroke="#E8192C" stroke-width="5"/><path d="M55 105l25-40h35l25 40M95 65v-8h18v8" fill="none" stroke="#374151" stroke-width="4"/>`
      : type === 'camioneta'
        ? `<path d="M20 100h40l15-25h55l15 25h35v25H20zm15 25a12 12 0 1 0 24 0 12 12 0 0 0-24 0Zm100 0a12 12 0 1 0 24 0 12 12 0 0 0-24 0Z" fill="#F3F4F6" stroke="#E8192C" stroke-width="4"/>`
        : // carro / otro
          `<path d="M25 100l15-30h100l15 30h15v25H10v-25zm15 25a12 12 0 1 0 24 0 12 12 0 0 0-24 0Zm100 0a12 12 0 1 0 24 0 12 12 0 0 0-24 0Z" fill="#F3F4F6" stroke="#E8192C" stroke-width="4"/>`

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'>
    <rect width='200' height='140' fill='#F9FAFB'/>
    ${icon}
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
