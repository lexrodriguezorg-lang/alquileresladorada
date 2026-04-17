import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  ContractStatus,
  ContractWithRelations,
} from '../lib/database.types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import ContractForm from '../components/forms/ContractForm'
import { inputCls } from '../components/FormField'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO') : '—'

const statusStyle: Record<ContractStatus, string> = {
  activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  borrador: 'bg-gray-50 text-gray-600 border-gray-200',
  finalizado: 'bg-sky-50 text-sky-700 border-sky-200',
  cancelado: 'bg-brand-soft text-brand border-brand/30',
  vencido: 'bg-orange-50 text-orange-700 border-orange-200',
}

export default function Contratos() {
  const [rows, setRows] = useState<ContractWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('contracts')
      .select(
        `
          id, contract_number, client_id, vehicle_id,
          start_date, end_date, rate_type, rate_value, deposit,
          total_amount, status, signed_at, notes, created_at, updated_at,
          client:client_id ( id, full_name, document_number ),
          vehicle:vehicle_id ( id, plate, brand, model )
        `
      )
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as ContractWithRelations[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.contract_number.toLowerCase().includes(q) ||
        (c.client?.full_name.toLowerCase().includes(q) ?? false) ||
        (c.client?.document_number.toLowerCase().includes(q) ?? false) ||
        (c.vehicle?.plate.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, query, statusFilter])

  const totalMonto = filtered.reduce(
    (acc, c) => acc + Number(c.total_amount ?? 0),
    0
  )

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Historial y seguimiento de contratos de alquiler"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
          >
            + Nuevo contrato
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo contrato"
        subtitle="Registro de nuevo contrato de alquiler"
        size="lg"
      >
        <ContractForm
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            load()
          }}
        />
      </Modal>

      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por Nº contrato, cliente, documento o placa…"
            className={`${inputCls} flex-1`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContractStatus | 'all')}
            className={inputCls}
          >
            <option value="all">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nº</th>
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">Vehículo</th>
                  <th className="px-4 py-3 text-left font-semibold">Inicio</th>
                  <th className="px-4 py-3 text-left font-semibold">Fin</th>
                  <th className="px-4 py-3 text-left font-semibold">Tarifa</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      {rows.length === 0
                        ? 'No hay contratos registrados.'
                        : 'Sin resultados para el filtro aplicado.'}
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {c.contract_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {c.client?.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.client?.document_number ?? ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {c.vehicle?.brand} {c.vehicle?.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        Placa {c.vehicle?.plate}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(c.start_date)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(c.end_date)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="capitalize">{c.rate_type}</div>
                      <div className="text-xs text-gray-500">
                        {COP.format(Number(c.rate_value ?? 0))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {COP.format(Number(c.total_amount ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="border-t border-gray-200 bg-gray-50 text-sm">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-500">
                      Total filtrado
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand">
                      {COP.format(totalMonto)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Mostrando {filtered.length} de {rows.length} contratos.
        </p>
      </div>
    </div>
  )
}
