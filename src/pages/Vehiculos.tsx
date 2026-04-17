import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vehicle, VehicleStatus } from '../lib/database.types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import VehicleForm from '../components/forms/VehicleForm'
import { inputCls } from '../components/FormField'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const statusStyle: Record<VehicleStatus, string> = {
  disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alquilado: 'bg-brand-soft text-brand border-brand/30',
  mantenimiento: 'bg-sky-50 text-sky-700 border-sky-200',
  inactivo: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function Vehiculos() {
  const [rows, setRows] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as Vehicle[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (!q) return true
      return (
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      )
    })
  }, [rows, query, statusFilter])

  return (
    <div>
      <PageHeader
        title="Vehículos"
        subtitle="Gestión de la flota"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
          >
            + Nuevo vehículo
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo vehículo"
        subtitle="Ingresa los datos del vehículo"
        size="lg"
      >
        <VehicleForm
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
            placeholder="Buscar por placa, marca o modelo…"
            className={`${inputCls} flex-1`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | 'all')}
            className={inputCls}
          >
            <option value="all">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="alquilado">Alquilado</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="inactivo">Inactivo</option>
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
                  <th className="px-4 py-3 text-left font-semibold">Placa</th>
                  <th className="px-4 py-3 text-left font-semibold">Vehículo</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Año</th>
                  <th className="px-4 py-3 text-right font-semibold">Tarifa diaria</th>
                  <th className="px-4 py-3 text-right font-semibold">Kilometraje</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      {rows.length === 0
                        ? 'No hay vehículos registrados.'
                        : 'Sin resultados para el filtro aplicado.'}
                    </td>
                  </tr>
                )}
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/vehiculos/${v.id}`)}
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {v.plate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {v.brand} {v.model}
                      </div>
                      {v.color && <div className="text-xs text-gray-500">{v.color}</div>}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{v.vehicle_type}</td>
                    <td className="px-4 py-3 text-gray-700">{v.year ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {COP.format(Number(v.daily_rate ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {v.mileage_km != null
                        ? `${v.mileage_km.toLocaleString('es-CO')} km`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Mostrando {filtered.length} de {rows.length} vehículos.
        </p>
      </div>
    </div>
  )
}
