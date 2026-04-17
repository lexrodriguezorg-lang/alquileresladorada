import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

interface BookingRequest {
  id: string
  start_at: string
  end_at: string
  status: string
  advance_amount: number | null
  notes: string | null
  created_at: string
  client: {
    id: string
    full_name: string
    document_number: string
    phone: string | null
    email: string | null
  } | null
  vehicle: {
    id: string
    plate: string
    brand: string
    model: string
    daily_rate: number
  } | null
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

function daysBetween(startAt: string, endAt: string) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime()
  return Math.max(1, Math.round(ms / 86_400_000))
}

export default function Solicitudes() {
  const [rows, setRows] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pendiente' | 'confirmada' | 'cancelada' | 'all'>('pendiente')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    let req = supabase
      .from('bookings')
      .select(
        `
          id, start_at, end_at, status, advance_amount, notes, created_at,
          client:client_id ( id, full_name, document_number, phone, email ),
          vehicle:vehicle_id ( id, plate, brand, model, daily_rate )
        `
      )
      .order('created_at', { ascending: false })
    if (filter !== 'all') req = req.eq('status', filter)
    const { data, error } = await req
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as BookingRequest[])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: string, status: 'confirmada' | 'cancelada') {
    setActing(id)
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setRows((prev) =>
        filter === 'all'
          ? prev.map((r) => (r.id === id ? { ...r, status } : r))
          : prev.filter((r) => r.id !== id)
      )
    }
    setActing(null)
  }

  const filters: Array<{ value: typeof filter; label: string }> = [
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'confirmada', label: 'Aprobadas' },
    { value: 'cancelada', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' },
  ]

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        subtitle="Reservas enviadas desde la web pública"
      />

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                filter === f.value
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-md border border-gray-200 bg-white"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
            No hay solicitudes {filter === 'all' ? '' : filter + 's'} por el momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((b) => {
              const days = daysBetween(b.start_at, b.end_at)
              const estimate = days * Number(b.vehicle?.daily_rate ?? 0)
              const waText = encodeURIComponent(
                `Hola ${b.client?.full_name ?? ''}, recibimos tu solicitud por el vehículo ${b.vehicle?.brand ?? ''} ${b.vehicle?.model ?? ''} (placa ${b.vehicle?.plate ?? ''}) del ${formatDate(b.start_at)} al ${formatDate(b.end_at)}.`
              )
              const waPhone = (b.client?.phone ?? '').replace(/[^\d]/g, '')
              const waUrl = `https://wa.me/${waPhone.length === 10 && waPhone.startsWith('3') ? '57' + waPhone : waPhone}?text=${waText}`

              return (
                <article
                  key={b.id}
                  className={`flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-5 border-l-[3px] ${
                    b.status === 'pendiente'
                      ? 'border-l-amber-400'
                      : b.status === 'confirmada'
                        ? 'border-l-emerald-500'
                        : 'border-l-brand'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Solicitud · {formatDateTime(b.created_at)}
                      </div>
                      <h3 className="mt-1 text-base font-bold text-gray-900">
                        {b.client?.full_name ?? '—'}
                      </h3>
                      <div className="mt-0.5 text-xs text-gray-500">
                        CC {b.client?.document_number ?? '—'}
                        {b.client?.phone ? ` · ${b.client.phone}` : ''}
                      </div>
                    </div>
                    <StatusPill status={b.status} />
                  </div>

                  <div className="rounded-md border border-gray-200 bg-[#F9FAFB] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Vehículo
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-900">
                      {b.vehicle?.brand} {b.vehicle?.model}
                    </div>
                    <div className="text-xs text-gray-500">
                      Placa {b.vehicle?.plate}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Stat label="Inicio" value={formatDate(b.start_at)} />
                    <Stat label="Fin" value={formatDate(b.end_at)} />
                    <Stat
                      label={`${days} día${days === 1 ? '' : 's'}`}
                      value={COP.format(estimate)}
                      strong
                    />
                  </div>

                  {b.notes && (
                    <p className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
                      <span className="font-semibold uppercase tracking-wider text-gray-500">
                        Nota:{' '}
                      </span>
                      {b.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {b.status === 'pendiente' && (
                      <>
                        <button
                          onClick={() => updateStatus(b.id, 'confirmada')}
                          disabled={acting === b.id}
                          className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {acting === b.id ? '…' : 'Aprobar'}
                        </button>
                        <button
                          onClick={() => updateStatus(b.id, 'cancelada')}
                          disabled={acting === b.id}
                          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {b.client?.phone && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
    confirmada: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelada: 'bg-brand-soft text-brand ring-brand/20',
    cumplida: 'bg-sky-50 text-sky-700 ring-sky-200',
    no_show: 'bg-gray-100 text-gray-700 ring-gray-200',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
        map[status] ?? map.pendiente
      }`}
    >
      {status}
    </span>
  )
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-2.5 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`mt-0.5 ${strong ? 'text-sm font-bold text-brand' : 'text-sm font-semibold text-gray-900'}`}
      >
        {value}
      </div>
    </div>
  )
}
