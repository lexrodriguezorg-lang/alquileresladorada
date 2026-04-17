import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { inputCls } from '../components/FormField'
import {
  downloadInvoice,
  shareInvoiceFile,
  type ContractForInvoice,
} from '../components/FacturaPDF'

// ------------------------------------------------------------------
// Tipos locales (el recibo usa campos extra como teléfono del cliente)
// ------------------------------------------------------------------
interface ContractForReceipt {
  id: string
  contract_number: string
  start_date: string
  end_date: string
  total_amount: number
  deposit: number | null
  rate_type: string
  rate_value: number
  status: string
  client: {
    id: string
    full_name: string
    document_number: string
    phone: string | null
  } | null
  vehicle: {
    id: string
    plate: string
    brand: string
    model: string
    year: number | null
  } | null
}

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

/**
 * Normaliza un teléfono colombiano para wa.me:
 * - quita espacios, guiones, paréntesis
 * - si empieza con +57 o 57 se conserva
 * - si son 10 dígitos empezando por 3, antepone 57
 */
function normalizePhoneForWa(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (!cleaned) return null
  if (cleaned.startsWith('57')) return cleaned
  if (cleaned.length === 10 && cleaned.startsWith('3')) return `57${cleaned}`
  return cleaned
}

function buildReceiptMessage(c: ContractForReceipt): string {
  const lines = [
    '*RECIBO DE ENTREGA*',
    'Alquileres La Dorada',
    '',
    `Recibo N°: ${c.contract_number}`,
    `Fecha: ${new Date().toLocaleDateString('es-CO')}`,
    '',
    '*CLIENTE*',
    `Nombre: ${c.client?.full_name ?? '—'}`,
    `Documento: ${c.client?.document_number ?? '—'}`,
    '',
    '*VEHÍCULO*',
    `Marca y modelo: ${c.vehicle?.brand ?? ''} ${c.vehicle?.model ?? ''}`.trim(),
    `Placa: ${c.vehicle?.plate ?? '—'}`,
    c.vehicle?.year ? `Año: ${c.vehicle.year}` : null,
    '',
    '*PERIODO DE ALQUILER*',
    `Fecha de inicio: ${formatDate(c.start_date)}`,
    `Fecha de fin: ${formatDate(c.end_date)}`,
    `Tarifa ${c.rate_type}: ${COP.format(Number(c.rate_value ?? 0))}`,
    '',
    '*VALORES*',
    c.deposit
      ? `Depósito: ${COP.format(Number(c.deposit))}`
      : null,
    `*Total: ${COP.format(Number(c.total_amount ?? 0))}*`,
    '',
    'Gracias por confiar en Alquileres La Dorada.',
  ]
  return lines.filter(Boolean).join('\n')
}

// ------------------------------------------------------------------
// Página
// ------------------------------------------------------------------
export default function Recibos() {
  const [rows, setRows] = useState<ContractForReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('contracts')
      .select(
        `
          id, contract_number, start_date, end_date, total_amount,
          deposit, rate_type, rate_value, status,
          client:client_id ( id, full_name, document_number, phone ),
          vehicle:vehicle_id ( id, plate, brand, model, year )
        `
      )
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as ContractForReceipt[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (c) =>
        c.contract_number.toLowerCase().includes(q) ||
        (c.client?.full_name.toLowerCase().includes(q) ?? false) ||
        (c.vehicle?.plate.toLowerCase().includes(q) ?? false)
    )
  }, [rows, query])

  const selected = rows.find((r) => r.id === selectedId) ?? null

  return (
    <div>
      <PageHeader
        title="Recibos"
        subtitle="Genera y envía recibos de entrega de vehículos"
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ---------- Columna izquierda: lista de contratos ---------- */}
        <div className="space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por Nº contrato, cliente o placa…"
            className={inputCls}
          />

          {error && (
            <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-y-auto">
              {loading && (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  Cargando contratos…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-gray-400">
                  No hay contratos disponibles.
                </div>
              )}
              <ul className="divide-y divide-gray-200">
                {filtered.map((c) => {
                  const isActive = c.id === selectedId
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedId(c.id)}
                        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${
                          isActive ? 'bg-brand-soft' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-500">
                              {c.contract_number}
                            </span>
                            <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-600">
                              {c.status}
                            </span>
                          </div>
                          <div className="mt-1 truncate font-medium text-gray-900">
                            {c.client?.full_name ?? '—'}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {c.vehicle?.brand} {c.vehicle?.model} · {c.vehicle?.plate}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold text-gray-900">
                            {COP.format(Number(c.total_amount ?? 0))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(c.end_date)}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* ---------- Columna derecha: recibo ---------- */}
        <div>
          {selected ? (
            <ReceiptPreview contract={selected} />
          ) : (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <div className="mb-3 text-4xl">📄</div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                Selecciona un contrato
              </h3>
              <p className="max-w-sm text-sm text-gray-500">
                Elige un contrato de la lista para generar el recibo de
                entrega y enviarlo al cliente por WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Vista del recibo
// ------------------------------------------------------------------
function ReceiptPreview({ contract }: { contract: ContractForReceipt }) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState<null | 'download' | 'share'>(
    null
  )
  const message = buildReceiptMessage(contract)
  const normalized = normalizePhoneForWa(contract.client?.phone ?? null)
  const waUrl = `https://wa.me/${normalized ?? ''}?text=${encodeURIComponent(message)}`

  // El tipo ContractForReceipt es compatible con ContractForInvoice
  const invoiceContract = contract as unknown as ContractForInvoice

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  const handleDownloadPdf = async () => {
    setGenerating('download')
    try {
      await downloadInvoice(invoiceContract)
    } finally {
      setGenerating(null)
    }
  }

  const handleShareWhatsAppFile = async () => {
    setGenerating('share')
    try {
      const shared = await shareInvoiceFile(
        invoiceContract,
        `Factura ${contract.contract_number} — Alquileres La Dorada`
      )
      if (!shared) {
        // Fallback: descarga el PDF y abre WhatsApp con instrucciones
        await downloadInvoice(invoiceContract)
        const fallbackText =
          `Hola ${contract.client?.full_name ?? ''}, te envío la factura ` +
          `${contract.contract_number} de Alquileres La Dorada. ` +
          `Te la adjunto como archivo PDF.`
        const url = `https://wa.me/${normalized ?? ''}?text=${encodeURIComponent(fallbackText)}`
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Documento (recibo) */}
      <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center justify-between bg-brand px-6 py-5 text-white">
          <div>
            <h3 className="text-lg font-bold">RECIBO DE ENTREGA</h3>
            <p className="text-xs text-white/80">Alquileres La Dorada</p>
          </div>
          <div className="text-right text-xs text-white/90">
            <div className="font-mono text-sm">
              N° {contract.contract_number}
            </div>
            <div>{new Date().toLocaleDateString('es-CO')}</div>
          </div>
        </header>

        <div className="divide-y divide-gray-200">
          <Section title="Cliente">
            <Row label="Nombre" value={contract.client?.full_name ?? '—'} />
            <Row
              label="Documento"
              value={contract.client?.document_number ?? '—'}
            />
            <Row
              label="Teléfono"
              value={contract.client?.phone ?? '—'}
            />
          </Section>

          <Section title="Vehículo">
            <Row
              label="Marca y modelo"
              value={`${contract.vehicle?.brand ?? ''} ${contract.vehicle?.model ?? ''}`.trim() || '—'}
            />
            <Row label="Placa" value={contract.vehicle?.plate ?? '—'} />
            {contract.vehicle?.year && (
              <Row label="Año" value={String(contract.vehicle.year)} />
            )}
          </Section>

          <Section title="Periodo de alquiler">
            <Row label="Fecha de inicio" value={formatDate(contract.start_date)} />
            <Row label="Fecha de fin" value={formatDate(contract.end_date)} />
            <Row
              label={`Tarifa ${contract.rate_type}`}
              value={COP.format(Number(contract.rate_value ?? 0))}
            />
          </Section>

          <Section title="Valores">
            {contract.deposit ? (
              <Row
                label="Depósito"
                value={COP.format(Number(contract.deposit))}
              />
            ) : null}
            <Row
              label="Total"
              value={COP.format(Number(contract.total_amount ?? 0))}
              strong
            />
          </Section>
        </div>

        <footer className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
          Gracias por confiar en Alquileres La Dorada.
        </footer>
      </article>

      {/* Acciones principales */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleShareWhatsAppFile}
          disabled={generating !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1DAE52] disabled:opacity-60"
        >
          <WhatsAppIcon />
          {generating === 'share'
            ? 'Preparando PDF…'
            : 'Enviar factura por WhatsApp'}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={generating !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C8152A] disabled:opacity-60"
        >
          {generating === 'download' ? 'Generando…' : 'Descargar factura PDF'}
        </button>
      </div>

      {/* Acciones secundarias (mensaje texto / utilidades) */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          Enviar resumen por texto
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          {copied ? '✓ Copiado' : 'Copiar texto'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          Imprimir
        </button>
      </div>

      {!normalized && (
        <div className="rounded-lg border-l-[3px] border-l-amber-400 border-y border-r border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          El cliente no tiene teléfono registrado. En móvil el botón de
          WhatsApp abrirá el selector del sistema; en escritorio se descargará
          el PDF y se abrirá WhatsApp Web para que adjuntes el archivo
          manualmente.
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Sub-componentes de presentación
// ------------------------------------------------------------------
function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="px-6 py-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h4>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd
        className={
          strong
            ? 'text-base font-bold text-brand'
            : 'text-sm font-medium text-gray-900'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.44 0 .08 5.36.08 11.96c0 2.11.55 4.17 1.6 5.98L0 24l6.23-1.63a11.96 11.96 0 0 0 5.81 1.48h.01c6.6 0 11.96-5.36 11.96-11.96 0-3.2-1.25-6.2-3.49-8.41Zm-8.48 18.4h-.01a9.93 9.93 0 0 1-5.06-1.39l-.36-.22-3.7.97.99-3.6-.24-.37a9.92 9.92 0 0 1-1.52-5.3c0-5.48 4.46-9.94 9.94-9.94 2.66 0 5.16 1.03 7.03 2.91a9.86 9.86 0 0 1 2.91 7.04c0 5.48-4.46 9.94-9.98 9.94Zm5.46-7.44c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.51-.07-.15-.68-1.64-.94-2.25-.25-.59-.5-.51-.68-.52h-.58c-.2 0-.51.07-.78.37-.27.3-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.67.61.7.22 1.34.19 1.84.11.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.34Z" />
    </svg>
  )
}
