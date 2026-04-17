import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { syncVehicleExpiryAlerts } from '../lib/alerts'
import PageHeader from '../components/PageHeader'

// ------------------------------------------------------------------
// Plantilla y validación
// ------------------------------------------------------------------
const COLUMNS = [
  'plate',
  'brand',
  'model',
  'vehicle_type',
  'year',
  'color',
  'engine_cc',
  'engine_liters',
  'mileage_km',
  'daily_rate',
  'weekly_rate',
  'monthly_rate',
  'specific_deposit',
  'soat_expiry',
  'rtm_expiry',
  'requirements_specific',
  'zone_restrictions',
  'notes',
  'status',
] as const

// Placa colombiana:
//  - Carros: 3 letras + 3 dígitos (ABC-123 o ABC123)
//  - Motos:  3 letras + 2 dígitos + 1 letra (ABC-12D o ABC12D)
const PLATE_RE = /^[A-Z]{3}-?(\d{3}|\d{2}[A-Z])$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TYPES = ['moto', 'carro', 'camioneta', 'otro'] as const
const STATUSES = ['disponible', 'alquilado', 'mantenimiento', 'inactivo'] as const

interface RawRow {
  [key: string]: string | undefined
}

interface CleanVehicle {
  plate: string
  brand: string
  model: string
  vehicle_type: string
  year: number
  color: string
  engine_cc: number | null
  engine_liters: number | null
  mileage_km: number
  daily_rate: number
  weekly_rate: number | null
  monthly_rate: number | null
  specific_deposit: number | null
  soat_expiry: string
  rtm_expiry: string
  requirements_specific: string | null
  zone_restrictions: string | null
  notes: string | null
  status: string
}

interface Validated {
  rowNumber: number // 1-based as in CSV + header
  raw: RawRow
  cleaned?: CleanVehicle
  errors: string[]
}

// Ejemplos para la plantilla descargable
const TEMPLATE_ROWS: RawRow[] = [
  {
    plate: 'ABC123',
    brand: 'Yamaha',
    model: 'FZ 2.0',
    vehicle_type: 'moto',
    year: '2023',
    color: 'Azul',
    engine_cc: '150',
    engine_liters: '',
    mileage_km: '6400',
    daily_rate: '55000',
    weekly_rate: '330000',
    monthly_rate: '1200000',
    specific_deposit: '',
    soat_expiry: '2026-12-31',
    rtm_expiry: '2026-12-31',
    requirements_specific: '',
    zone_restrictions: '',
    notes: 'Mantenimiento al día',
    status: 'disponible',
  },
  {
    plate: 'XYZ456',
    brand: 'Chevrolet',
    model: 'Spark GT',
    vehicle_type: 'carro',
    year: '2022',
    color: 'Blanco',
    engine_cc: '',
    engine_liters: '1.2',
    mileage_km: '35000',
    daily_rate: '120000',
    weekly_rate: '720000',
    monthly_rate: '2800000',
    specific_deposit: '300000',
    soat_expiry: '2026-09-30',
    rtm_expiry: '2026-09-30',
    requirements_specific: '',
    zone_restrictions: 'No apto para carreteras destapadas',
    notes: '',
    status: 'disponible',
  },
]

function downloadTemplate() {
  const csv = Papa.unparse(TEMPLATE_ROWS, {
    columns: COLUMNS as unknown as string[],
  })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-vehiculos.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function num(s: string | undefined): number | null {
  if (s == null) return null
  const t = String(s).trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
function strOrNull(s: string | undefined): string | null {
  if (s == null) return null
  const t = String(s).trim()
  return t === '' ? null : t
}

function validateRow(
  raw: RawRow,
  rowNumber: number,
  existingPlates: Set<string>,
  plateCountInCsv: Map<string, number>
): Validated {
  const errors: string[] = []

  const plate = (raw.plate ?? '').toString().trim().toUpperCase()
  if (!plate) errors.push('Placa requerida')
  else if (!PLATE_RE.test(plate))
    errors.push('Placa inválida (formato ABC-123 o ABC-12D)')
  else if (existingPlates.has(plate))
    errors.push('Placa ya registrada en el sistema')
  else if ((plateCountInCsv.get(plate) ?? 0) > 1)
    errors.push('Placa duplicada dentro del CSV')

  const brand = (raw.brand ?? '').toString().trim()
  if (!brand) errors.push('Marca requerida')

  const model = (raw.model ?? '').toString().trim()
  if (!model) errors.push('Modelo requerido')

  const vehicle_type = (raw.vehicle_type ?? '').toString().trim().toLowerCase()
  if (!TYPES.includes(vehicle_type as (typeof TYPES)[number]))
    errors.push(`Tipo inválido (use: ${TYPES.join(', ')})`)

  const year = num(raw.year)
  if (year == null || !Number.isInteger(year) || year < 1990 || year > 2026)
    errors.push('Año inválido (1990-2026)')

  const color = (raw.color ?? '').toString().trim()
  if (!color) errors.push('Color requerido')

  const mileage_km = num(raw.mileage_km)
  if (mileage_km == null || mileage_km < 0)
    errors.push('Kilometraje inválido (≥ 0)')

  const daily_rate = num(raw.daily_rate)
  if (daily_rate == null || daily_rate <= 0)
    errors.push('Precio por día requerido (> 0)')

  const soat_expiry = (raw.soat_expiry ?? '').toString().trim()
  if (!soat_expiry) errors.push('Fecha SOAT requerida')
  else if (!DATE_RE.test(soat_expiry))
    errors.push('SOAT con formato inválido (YYYY-MM-DD)')

  const rtm_expiry = (raw.rtm_expiry ?? '').toString().trim()
  if (!rtm_expiry) errors.push('Fecha RTM requerida')
  else if (!DATE_RE.test(rtm_expiry))
    errors.push('RTM con formato inválido (YYYY-MM-DD)')

  const statusRaw = (raw.status ?? 'disponible').toString().trim().toLowerCase()
  const status = statusRaw || 'disponible'
  if (!STATUSES.includes(status as (typeof STATUSES)[number]))
    errors.push(`Estado inválido (use: ${STATUSES.join(', ')})`)

  if (errors.length > 0) {
    return { rowNumber, raw, errors }
  }

  const cleaned: CleanVehicle = {
    plate,
    brand,
    model,
    vehicle_type,
    year: year!,
    color,
    engine_cc: vehicle_type === 'moto' ? num(raw.engine_cc) : null,
    engine_liters: vehicle_type !== 'moto' ? num(raw.engine_liters) : null,
    mileage_km: mileage_km!,
    daily_rate: daily_rate!,
    weekly_rate: num(raw.weekly_rate),
    monthly_rate: num(raw.monthly_rate),
    specific_deposit: num(raw.specific_deposit),
    soat_expiry,
    rtm_expiry,
    requirements_specific: strOrNull(raw.requirements_specific),
    zone_restrictions: strOrNull(raw.zone_restrictions),
    notes: strOrNull(raw.notes),
    status,
  }

  return { rowNumber, raw, cleaned, errors: [] }
}

// ------------------------------------------------------------------
// Página
// ------------------------------------------------------------------
export default function VehiculosImportar() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Validated[]>([])
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    created: number
    failed: Array<{ plate: string; reason: string }>
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const summary = useMemo(() => {
    const ok = rows.filter((r) => r.errors.length === 0).length
    const err = rows.length - ok
    return { ok, err, total: rows.length }
  }, [rows])

  const parseFile = useCallback(async (file: File) => {
    setParsing(true)
    setParseError(null)
    setResult(null)
    try {
      // 1) Traer placas ya registradas para detectar duplicados
      const { data: existing, error: existErr } = await supabase
        .from('vehicles')
        .select('plate')
      if (existErr) throw existErr
      const existingPlates = new Set<string>(
        ((existing ?? []) as Array<{ plate: string }>).map((v) =>
          v.plate.toUpperCase()
        )
      )

      // 2) Parsear CSV con PapaParse
      const parsed = await new Promise<Papa.ParseResult<RawRow>>((resolve, reject) => {
        Papa.parse<RawRow>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: resolve,
          error: reject,
        })
      })

      if (parsed.errors.length) {
        setParseError(
          `Error al parsear CSV: ${parsed.errors
            .slice(0, 3)
            .map((e) => e.message)
            .join(' · ')}`
        )
      }

      // 3) Contar placas duplicadas DENTRO del CSV
      const plateCount = new Map<string, number>()
      for (const r of parsed.data) {
        const p = (r.plate ?? '').toString().trim().toUpperCase()
        if (p) plateCount.set(p, (plateCount.get(p) ?? 0) + 1)
      }

      // 4) Validar cada fila
      const validated = parsed.data.map((r, i) =>
        validateRow(r, i + 2, existingPlates, plateCount)
      )
      setRows(validated)
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Error leyendo el archivo')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleImport = useCallback(async () => {
    const valid = rows.filter((r) => r.errors.length === 0 && r.cleaned)
    if (valid.length === 0) return
    setImporting(true)
    setResult(null)
    const failed: Array<{ plate: string; reason: string }> = []
    const createdIds: Array<{
      id: string
      plate: string
      soat_expiry: string
      rtm_expiry: string
    }> = []

    try {
      // Intenta insertar en batch; si falla el insert grande,
      // hace fallback a fila por fila para identificar cuáles fallaron.
      const payload = valid.map((r) => r.cleaned as CleanVehicle)
      const { data, error } = await supabase
        .from('vehicles')
        .insert(payload)
        .select('id, plate, soat_expiry, rtm_expiry')

      if (error) {
        // Fallback 1×1 para reportar errores por placa
        for (const r of valid) {
          const v = r.cleaned as CleanVehicle
          const { data: one, error: err } = await supabase
            .from('vehicles')
            .insert(v)
            .select('id, plate, soat_expiry, rtm_expiry')
            .single()
          if (err) failed.push({ plate: v.plate, reason: err.message })
          else if (one)
            createdIds.push(
              one as {
                id: string
                plate: string
                soat_expiry: string
                rtm_expiry: string
              }
            )
        }
      } else {
        createdIds.push(
          ...(data as Array<{
            id: string
            plate: string
            soat_expiry: string
            rtm_expiry: string
          }>)
        )
      }

      // Dispara alertas SOAT/RTM por cada vehículo creado (en paralelo, máx 5)
      for (let i = 0; i < createdIds.length; i += 5) {
        const chunk = createdIds.slice(i, i + 5)
        await Promise.all(chunk.map((v) => syncVehicleExpiryAlerts(v)))
      }
    } catch (e: unknown) {
      setParseError(
        e instanceof Error ? e.message : 'Error inesperado durante la importación'
      )
    } finally {
      setImporting(false)
      setResult({ created: createdIds.length, failed })
    }
  }, [rows])

  const downloadErrors = () => {
    const errRows = rows.filter((r) => r.errors.length > 0)
    if (errRows.length === 0) return
    const exportable = errRows.map((r) => ({
      ...r.raw,
      _errores: r.errors.join(' · '),
    }))
    const csv = Papa.unparse(exportable)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'filas-con-errores.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setRows([])
    setResult(null)
    setParseError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <PageHeader
        title="Importar vehículos (CSV)"
        subtitle="Carga masiva desde Excel/Google Sheets"
        actions={
          <button
            onClick={() => navigate('/vehiculos')}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            ← Volver a vehículos
          </button>
        }
      />

      <div className="space-y-6 p-6">
        {/* ---------- Resultado final ---------- */}
        {result && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Importación terminada
                </h3>
                <p className="text-sm text-gray-500">
                  {result.created} vehículo{result.created === 1 ? '' : 's'} creado
                  {result.created === 1 ? '' : 's'}
                  {result.failed.length > 0 &&
                    ` · ${result.failed.length} con error`}
                </p>
              </div>
            </div>
            {result.failed.length > 0 && (
              <ul className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
                {result.failed.map((f, i) => (
                  <li key={i} className="text-gray-700">
                    <span className="font-mono font-semibold">{f.plate}</span>:{' '}
                    {f.reason}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/vehiculos')}
                className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-[#C8152A]"
              >
                Ver flota
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
              >
                Importar otro archivo
              </button>
            </div>
          </div>
        )}

        {/* ---------- Paso 1: Plantilla ---------- */}
        {!result && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                  Paso 1
                </div>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  Descarga la plantilla
                </h3>
                <p className="mt-1 max-w-xl text-sm text-gray-600">
                  Abre el CSV en Excel o Google Sheets, llena una fila por cada
                  vehículo y guarda/exporta como CSV.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Obligatorios: <code>plate · brand · model · vehicle_type · year · color · mileage_km · daily_rate · soat_expiry · rtm_expiry</code>
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="shrink-0 rounded-md bg-brand px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#C8152A]"
              >
                Descargar plantilla
              </button>
            </div>
          </section>
        )}

        {/* ---------- Paso 2: Subir archivo ---------- */}
        {!result && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              Paso 2
            </div>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              Sube el CSV completado
            </h3>

            <label
              htmlFor="csv-input"
              className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-[#F9FAFB] px-4 py-10 text-center transition hover:border-brand hover:bg-brand-soft/40"
            >
              <span className="text-2xl">📂</span>
              <span className="text-sm font-semibold text-gray-900">
                Haz click para seleccionar un archivo CSV
              </span>
              <span className="text-xs text-gray-500">
                o arrastra y suelta aquí
              </span>
            </label>
            <input
              id="csv-input"
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) parseFile(f)
              }}
            />

            {parsing && (
              <div className="mt-3 text-sm text-gray-500">
                Procesando archivo…
              </div>
            )}
            {parseError && (
              <div className="mt-3 rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                {parseError}
              </div>
            )}
          </section>
        )}

        {/* ---------- Paso 3: Preview y confirmación ---------- */}
        {!result && rows.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#F9FAFB] px-5 py-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
                  Paso 3
                </div>
                <h3 className="mt-1 text-lg font-bold text-gray-900">
                  Revisa y confirma
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold text-emerald-600">
                    {summary.ok} válidos
                  </span>
                  {summary.err > 0 && (
                    <>
                      {' '}·{' '}
                      <span className="font-semibold text-brand">
                        {summary.err} con errores
                      </span>
                    </>
                  )}{' '}
                  de {summary.total} filas
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.err > 0 && (
                  <button
                    onClick={downloadErrors}
                    className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 hover:border-gray-300"
                  >
                    Descargar filas con errores
                  </button>
                )}
                <button
                  onClick={reset}
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 hover:border-gray-300"
                >
                  Limpiar
                </button>
                <button
                  onClick={handleImport}
                  disabled={summary.ok === 0 || importing}
                  className="rounded-md bg-brand px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#C8152A] disabled:opacity-60"
                >
                  {importing
                    ? 'Importando…'
                    : `Importar ${summary.ok} vehículo${summary.ok === 1 ? '' : 's'}`}
                </button>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-gray-200 bg-[#F9FAFB] text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Fila</th>
                    <th className="px-3 py-2 text-left">Placa</th>
                    <th className="px-3 py-2 text-left">Marca · Modelo</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Año</th>
                    <th className="px-3 py-2 text-right">Precio/día</th>
                    <th className="px-3 py-2 text-left">SOAT</th>
                    <th className="px-3 py-2 text-left">RTM</th>
                    <th className="px-3 py-2 text-left">Estado / Errores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((r) => {
                    const hasErr = r.errors.length > 0
                    return (
                      <tr
                        key={r.rowNumber}
                        className={hasErr ? 'bg-brand-soft/30' : ''}
                      >
                        <td className="px-3 py-2 font-mono text-gray-500">
                          {r.rowNumber}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold">
                          {(r.raw.plate ?? '').toString().toUpperCase() || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.raw.brand || '—'} {r.raw.model || ''}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {r.raw.vehicle_type || '—'}
                        </td>
                        <td className="px-3 py-2">{r.raw.year || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          {r.raw.daily_rate || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.raw.soat_expiry || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.raw.rtm_expiry || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {hasErr ? (
                            <span className="font-medium text-brand">
                              {r.errors.join(' · ')}
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-600">
                              ✓ listo
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center">
          <Link
            to="/vehiculos"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            Cancelar y volver
          </Link>
        </div>
      </div>
    </div>
  )
}
