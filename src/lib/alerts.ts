import { supabase } from './supabase'

/**
 * Días antes del vencimiento en los que se generan alertas automáticas.
 */
const DAYS_BEFORE = [30, 15, 7, 1] as const

interface VehicleExpiryInput {
  id: string
  plate: string
  soat_expiry: string | null
  rtm_expiry: string | null
}

/**
 * Sincroniza alertas de vencimiento (SOAT y RTM) para un vehículo:
 * 1. Borra alertas previas de SOAT/RTM de ese vehículo.
 * 2. Inserta nuevas alertas a 30, 15, 7 y 1 día antes de cada fecha,
 *    saltando las que ya quedaron en el pasado.
 *
 * Severidad:
 *   30d → baja · 15d → media · 7d → alta · 1d → crítica
 */
export async function syncVehicleExpiryAlerts(
  vehicle: VehicleExpiryInput
): Promise<void> {
  const { id, plate, soat_expiry, rtm_expiry } = vehicle

  // 1. Limpiar alertas previas (filtramos por título que empiece con SOAT/RTM)
  await supabase
    .from('alerts')
    .delete()
    .eq('vehicle_id', id)
    .or('title.ilike.SOAT%,title.ilike.RTM%')

  // 2. Construir nuevas alertas
  const now = Date.now()
  const docs: Array<{ doc: 'SOAT' | 'RTM'; expiry: string | null }> = [
    { doc: 'SOAT', expiry: soat_expiry },
    { doc: 'RTM', expiry: rtm_expiry },
  ]

  const toInsert: Array<{
    alert_type: string
    severity: string
    title: string
    message: string
    vehicle_id: string
    due_at: string
    resolved: boolean
  }> = []

  for (const { doc, expiry } of docs) {
    if (!expiry) continue
    const expiryDate = new Date(`${expiry}T08:00:00`)
    if (Number.isNaN(expiryDate.getTime())) continue

    for (const days of DAYS_BEFORE) {
      const due = new Date(expiryDate)
      due.setDate(due.getDate() - days)

      // Saltar alertas que ya están en el pasado
      if (due.getTime() < now) continue

      const severity =
        days === 1
          ? 'critica'
          : days === 7
            ? 'alta'
            : days === 15
              ? 'media'
              : 'baja'

      toInsert.push({
        alert_type: 'mantenimiento',
        severity,
        title: `${doc} vence en ${days} día${days === 1 ? '' : 's'} — ${plate}`,
        message: `El ${doc} del vehículo ${plate} vence el ${expiryDate.toLocaleDateString('es-CO')}.`,
        vehicle_id: id,
        due_at: due.toISOString(),
        resolved: false,
      })
    }
  }

  if (toInsert.length === 0) return
  await supabase.from('alerts').insert(toInsert)
}
