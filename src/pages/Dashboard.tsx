import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Alert,
  AlertSeverity,
  ContractWithRelations,
  FleetStats,
} from '../lib/database.types'
import PageHeader from '../components/PageHeader'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('es-CO') : '—'

// Borde izquierdo 3px — rojo crítica, amarillo alta, gris el resto
const alertBorder: Record<AlertSeverity, string> = {
  baja: 'border-l-gray-300',
  media: 'border-l-gray-300',
  alta: 'border-l-amber-400',
  critica: 'border-l-[#E8192C]',
}

const alertBadge: Record<AlertSeverity, string> = {
  baja: 'bg-gray-100 text-gray-600',
  media: 'bg-gray-100 text-gray-600',
  alta: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  critica: 'bg-brand-soft text-brand ring-1 ring-brand/20',
}

// Estado de contrato en la tabla — estilo minimalista en una sola línea
const contractStatusDot: Record<string, string> = {
  activo: 'bg-emerald-500',
  borrador: 'bg-gray-400',
  finalizado: 'bg-sky-500',
  cancelado: 'bg-brand',
  vencido: 'bg-amber-500',
}

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
export default function Dashboard() {
  const [stats, setStats] = useState<FleetStats>({
    total: 0,
    rented: 0,
    available: 0,
    maintenance: 0,
    inactive: 0,
  })
  const [contracts, setContracts] = useState<ContractWithRelations[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError(null)
      try {
        const vehiclesReq = supabase
          .from('vehicles')
          .select('status', { count: 'exact' })

        const contractsReq = supabase
          .from('contracts')
          .select(
            `
              id, contract_number, start_date, end_date, total_amount, status, rate_type,
              client:client_id ( id, full_name, document_number ),
              vehicle:vehicle_id ( id, plate, brand, model )
            `
          )
          .order('created_at', { ascending: false })
          .limit(8)

        const alertsReq = supabase
          .from('alerts')
          .select('*')
          .eq('resolved', false)
          .or('alert_type.eq.mantenimiento,title.ilike.%soat%,title.ilike.%rtm%')
          .order('due_at', { ascending: true, nullsFirst: false })
          .limit(10)

        const [vehiclesRes, contractsRes, alertsRes] = await Promise.all([
          vehiclesReq,
          contractsReq,
          alertsReq,
        ])

        if (cancelled) return

        if (vehiclesRes.error) throw vehiclesRes.error
        if (contractsRes.error) throw contractsRes.error
        if (alertsRes.error) throw alertsRes.error

        const rows = vehiclesRes.data ?? []
        setStats({
          total: vehiclesRes.count ?? rows.length,
          rented: rows.filter((v) => v.status === 'alquilado').length,
          available: rows.filter((v) => v.status === 'disponible').length,
          maintenance: rows.filter((v) => v.status === 'mantenimiento').length,
          inactive: rows.filter((v) => v.status === 'inactivo').length,
        })
        setContracts(
          (contractsRes.data ?? []) as unknown as ContractWithRelations[]
        )
        setAlerts((alertsRes.data ?? []) as Alert[])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error desconocido'
        console.error('Dashboard load error:', e)
        if (!cancelled) setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [])

  const criticalAlerts = alerts.filter(
    (a) => a.severity === 'critica' || a.severity === 'alta'
  ).length

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={new Date()
          .toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
          .replace(/^\w/, (c) => c.toUpperCase())}
      />

      <div className="space-y-10 p-6">
        {error && (
          <div className="rounded-md border-l-4 border-l-[#E8192C] border-y border-r border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
            <span className="font-semibold text-brand">Error: </span>
            {error}
          </div>
        )}

        {/* ------------------ FLOTA ------------------ */}
        <section>
          <SectionTitle>Flota</SectionTitle>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total vehículos" value={stats.total} loading={loading} />
            <StatCard
              label="En arriendo"
              value={stats.rented}
              loading={loading}
              highlight
            />
            <StatCard label="Disponibles" value={stats.available} loading={loading} />
            <StatCard label="Mantenimiento" value={stats.maintenance} loading={loading} />
            <StatCard label="Inactivos" value={stats.inactive} loading={loading} />
          </div>
        </section>

        {/* ------------------ CONTRATOS RECIENTES ------------------ */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <SectionTitle>Contratos recientes</SectionTitle>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {contracts.length} resultado{contracts.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-200 bg-[#F9FAFB]">
                  <tr>
                    <Th>Contrato</Th>
                    <Th>Cliente</Th>
                    <Th>Vehículo</Th>
                    <Th>Inicio</Th>
                    <Th>Fin</Th>
                    <Th className="text-right">Total</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && contracts.length === 0 && (
                    <SkeletonRows cols={7} rows={4} />
                  )}
                  {!loading && contracts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                        Aún no hay contratos registrados.
                      </td>
                    </tr>
                  )}
                  {contracts.map((c) => (
                    <tr key={c.id} className="transition hover:bg-[#F9FAFB]">
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">
                        {c.contract_number}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {c.client?.full_name ?? '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.client?.document_number ?? ''}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          {c.vehicle?.brand} {c.vehicle?.model}
                        </div>
                        <div className="text-xs text-gray-500">
                          Placa {c.vehicle?.plate}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {formatDate(c.start_date)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {formatDate(c.end_date)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-brand tabular-nums">
                        {COP.format(Number(c.total_amount ?? 0))}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 text-xs font-medium capitalize text-gray-700">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              contractStatusDot[c.status] ?? 'bg-gray-400'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ------------------ ALERTAS ------------------ */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <SectionTitle>Alertas SOAT / RTM</SectionTitle>
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {alerts.length} activa{alerts.length === 1 ? '' : 's'}
              {criticalAlerts > 0 && (
                <>
                  {' · '}
                  <span className="text-brand">{criticalAlerts} urgente{criticalAlerts === 1 ? '' : 's'}</span>
                </>
              )}
            </span>
          </div>

          {loading && alerts.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[92px] animate-pulse rounded-md border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
              Sin alertas de SOAT o RTM pendientes.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {alerts.map((a) => (
                <article
                  key={a.id}
                  className={`rounded-md border border-gray-200 bg-white px-4 py-3 border-l-[3px] ${alertBorder[a.severity]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      {a.message && (
                        <p className="mt-1 text-sm text-gray-600">{a.message}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${alertBadge[a.severity]}`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    <span>{a.alert_type.replaceAll('_', ' ')}</span>
                    <span>
                      {a.due_at
                        ? `Vence ${formatDate(a.due_at)}`
                        : `Creada ${formatDate(a.created_at)}`}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-componentes
// ------------------------------------------------------------------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
      {children}
    </h2>
  )
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 ${className}`}
    >
      {children}
    </th>
  )
}

interface StatCardProps {
  label: string
  value: number
  loading?: boolean
  highlight?: boolean
}

function StatCard({ label, value, loading, highlight }: StatCardProps) {
  return (
    <div
      className={`relative rounded-md border bg-white px-5 py-5 transition ${
        highlight
          ? 'border-brand/30'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {highlight && (
        <span className="absolute left-0 top-4 h-8 w-0.5 rounded-full bg-brand" />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-10 w-16 animate-pulse rounded bg-gray-100" />
      ) : (
        <p
          className={`mt-3 text-4xl font-bold tabular-nums leading-none ${
            highlight ? 'text-brand' : 'text-gray-900'
          }`}
        >
          {value}
        </p>
      )}
    </div>
  )
}

function SkeletonRows({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-4">
              <div className="h-3.5 w-full animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
