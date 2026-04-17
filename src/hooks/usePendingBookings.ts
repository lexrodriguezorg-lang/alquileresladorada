import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Devuelve el conteo de reservas con status='pendiente'.
 * Se refresca al montar y se suscribe a cambios en realtime.
 */
export function usePendingBookings() {
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCount() {
      const { count, error } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendiente')
      if (!cancelled && !error) setCount(count ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel('pending-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => fetchCount()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return count
}
