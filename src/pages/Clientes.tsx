import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/database.types'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import ClientForm from '../components/forms/ClientForm'
import { inputCls } from '../components/FormField'

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO') : '—'

export default function Clientes() {
  const [rows, setRows] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [onlyBlacklisted, setOnlyBlacklisted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as Client[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((c) => {
      if (onlyBlacklisted && !c.blacklisted) return false
      if (!q) return true
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.document_number.toLowerCase().includes(q) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, query, onlyBlacklisted])

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Base de clientes registrados"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
          >
            + Nuevo cliente
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo cliente"
        subtitle="Ingresa los datos del cliente"
        size="lg"
      >
        <ClientForm
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            load()
          }}
        />
      </Modal>

      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, documento, teléfono o correo…"
            className={`${inputCls} flex-1`}
          />
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyBlacklisted}
              onChange={(e) => setOnlyBlacklisted(e.target.checked)}
              className="accent-[#E8192C]"
            />
            Solo vetados
          </label>
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
                  <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold">Documento</th>
                  <th className="px-4 py-3 text-left font-semibold">Contacto</th>
                  <th className="px-4 py-3 text-left font-semibold">Ciudad</th>
                  <th className="px-4 py-3 text-left font-semibold">Licencia</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      {rows.length === 0
                        ? 'No hay clientes registrados.'
                        : 'Sin resultados para el filtro aplicado.'}
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.full_name}</div>
                      {c.address && <div className="text-xs text-gray-500">{c.address}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                        {c.document_type}
                      </span>
                      <span className="ml-2 font-mono text-gray-700">{c.document_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{c.phone ?? '—'}</div>
                      {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.license_number ? (
                        <>
                          <div className="font-mono text-gray-700">{c.license_number}</div>
                          <div className="text-xs text-gray-500">
                            Vence: {formatDate(c.license_expiry)}
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.blacklisted ? (
                        <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                          Vetado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Activo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Mostrando {filtered.length} de {rows.length} clientes.
        </p>
      </div>
    </div>
  )
}
