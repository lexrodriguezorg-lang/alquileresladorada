import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../lib/database.types'
import PageHeader from '../components/PageHeader'
import { syncVehicleExpiryAlerts } from '../lib/alerts'
import {
  SLOT_LABEL,
  VEHICLE_PHOTO_SLOTS,
  deleteVehicleSlotPhoto,
  photoFromSlot,
  setSlotInPhotos,
  uploadVehicleSlotPhoto,
  type VehicleSlot,
} from '../lib/storage'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function VehiculoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) setError(error.message)
    else setVehicle(data as Vehicle)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">Cargando…</div>
    )
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          Vehículo no encontrado.{' '}
          <Link to="/vehiculos" className="font-semibold text-brand hover:underline">
            Volver a la lista
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}`}
        subtitle={`Placa ${vehicle.plate} · ${vehicle.vehicle_type}`}
        actions={
          <button
            onClick={() => navigate('/vehiculos')}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            ← Volver
          </button>
        }
      />

      {error && (
        <div className="mx-6 mt-4 rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          {error}
        </div>
      )}

      <PendingDataBanner vehicle={vehicle} onUpdated={load} onError={setError} />
      <PendingPhotoBanner vehicle={vehicle} />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_auto]">
        {/* ---------- Columna izquierda: fotos ---------- */}
        <section id="fotos">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Fotos del vehículo
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Sube una foto por cada ángulo. La del frente es la principal en el catálogo público.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VEHICLE_PHOTO_SLOTS.map((slot, idx) => (
              <PhotoSlotCard
                key={slot}
                slot={slot}
                primary={idx === 0}
                vehicle={vehicle}
                onUpdated={load}
                onError={setError}
              />
            ))}
          </div>
        </section>

        {/* ---------- Sidebar: datos del vehículo ---------- */}
        <aside className="lg:w-80">
          <div className="sticky top-4 space-y-4">
            {/* Estado del vehículo (acción) */}
            <StatusManager
              vehicle={vehicle}
              onChange={load}
              onError={setError}
            />

            {/* Resumen de datos */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Resumen
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <Row k="Marca" v={vehicle.brand} />
                <Row k="Modelo" v={vehicle.model} />
                <Row k="Año" v={vehicle.year ? String(vehicle.year) : '—'} />
                <Row k="Cilindraje" v={vehicle.engine_cc ? `${vehicle.engine_cc} cc` : '—'} />
                <Row k="Color" v={vehicle.color ?? '—'} />
                <Row k="Kilometraje" v={vehicle.mileage_km != null ? `${vehicle.mileage_km.toLocaleString('es-CO')} km` : '—'} />
              </div>
              <div className="mt-4 rounded-lg border border-gray-200 bg-[#F9FAFB] p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Tarifa diaria
                </div>
                <div
                  className="text-2xl font-black text-brand"
                  style={{ fontFamily: 'var(--font-brand)' }}
                >
                  {COP.format(Number(vehicle.daily_rate))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Card por cada slot de foto
// ------------------------------------------------------------------
function PhotoSlotCard({
  slot,
  primary,
  vehicle,
  onUpdated,
  onError,
}: {
  slot: VehicleSlot
  primary: boolean
  vehicle: Vehicle
  onUpdated: () => void
  onError: (msg: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = photoFromSlot(vehicle.photos, slot)

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      onError('Archivo muy grande (máx. 10 MB)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadVehicleSlotPhoto(vehicle.id, slot, file)
      const photos = setSlotInPhotos(vehicle.photos, slot, url)
      const { error } = await supabase
        .from('vehicles')
        .update({ photos })
        .eq('id', vehicle.id)
      if (error) throw error
      onUpdated()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Error subiendo la foto')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la foto "${SLOT_LABEL[slot]}"?`)) return
    setDeleting(true)
    try {
      await deleteVehicleSlotPhoto(vehicle.id, slot)
      const photos = setSlotInPhotos(vehicle.photos, slot, null)
      const { error } = await supabase
        .from('vehicles')
        .update({ photos })
        .eq('id', vehicle.id)
      if (error) throw error
      onUpdated()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'Error eliminando la foto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 bg-[#F9FAFB] px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              primary
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200'
            }`}
          >
            {primary ? 'Principal' : slot}
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {SLOT_LABEL[slot]}
          </span>
        </div>
        {current && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-brand disabled:opacity-60"
          >
            {deleting ? '…' : 'Quitar'}
          </button>
        )}
      </div>

      <div className="relative aspect-[4/3] bg-gray-50">
        {current ? (
          <img
            src={current}
            alt={SLOT_LABEL[slot]}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
            <CameraIcon className="h-10 w-10" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              Sin foto
            </span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-gray-700">
            Subiendo…
          </div>
        )}
      </div>

      <div className="p-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {uploading ? 'Subiendo…' : current ? 'Cambiar foto' : 'Subir foto'}
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Status Manager — cambia el estado del vehículo con un click
// ------------------------------------------------------------------
const STATUS_OPTIONS: Array<{
  value: 'disponible' | 'alquilado' | 'mantenimiento' | 'inactivo'
  label: string
  desc: string
  classes: { active: string; idle: string; dot: string }
}> = [
  {
    value: 'disponible',
    label: 'Disponible',
    desc: 'Visible en catálogo público',
    classes: {
      active:
        'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20',
      idle: 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300',
      dot: 'bg-emerald-500',
    },
  },
  {
    value: 'alquilado',
    label: 'Alquilado',
    desc: 'En uso por un cliente',
    classes: {
      active:
        'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20',
      idle: 'border-gray-200 bg-white text-gray-700 hover:border-amber-300',
      dot: 'bg-amber-500',
    },
  },
  {
    value: 'mantenimiento',
    label: 'Mantenimiento',
    desc: 'Fuera temporalmente',
    classes: {
      active: 'border-sky-500 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20',
      idle: 'border-gray-200 bg-white text-gray-700 hover:border-sky-300',
      dot: 'bg-sky-500',
    },
  },
  {
    value: 'inactivo',
    label: 'Inactivo',
    desc: 'Retirado de la flota',
    classes: {
      active:
        'border-gray-400 bg-gray-100 text-gray-800 ring-2 ring-gray-400/20',
      idle: 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
      dot: 'bg-gray-500',
    },
  },
]

function StatusManager({
  vehicle,
  onChange,
  onError,
}: {
  vehicle: Vehicle
  onChange: () => void
  onError: (msg: string) => void
}) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  async function setStatus(next: (typeof STATUS_OPTIONS)[number]['value']) {
    if (next === vehicle.status) return
    setUpdating(next)
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: next })
        .eq('id', vehicle.id)
      if (error) throw error
      setSavedAt(Date.now())
      onChange()
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const showSaved = savedAt && Date.now() - savedAt < 2500

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
          Estado
        </div>
        {showSaved && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            ✓ Guardado
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Click para cambiar. Solo los <span className="font-semibold text-gray-700">disponibles</span> aparecen en el catálogo público.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const active = vehicle.status === opt.value
          const isUpdating = updating === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              disabled={isUpdating || updating !== null}
              className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                active ? opt.classes.active : opt.classes.idle
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${opt.classes.dot}`} />
                <span className="text-sm font-bold">
                  {isUpdating ? 'Guardando…' : opt.label}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 leading-tight">
                {opt.desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k}</dt>
      <dd className="text-right font-medium text-gray-900">{v}</dd>
    </div>
  )
}

// ------------------------------------------------------------------
// Banner: este vehículo no tiene foto principal todavía
// ------------------------------------------------------------------
function PendingPhotoBanner({ vehicle }: { vehicle: Vehicle }) {
  const hasAnyPhoto = !!(
    vehicle.photos && vehicle.photos.find((p) => p && p.trim() !== '')
  )
  if (hasAnyPhoto) return null
  return (
    <div className="mx-6 mt-3 flex flex-col gap-3 rounded-md border-l-[3px] border-l-amber-400 border-y border-r border-gray-200 bg-amber-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm">
          📷
        </span>
        <div>
          <div className="text-sm font-bold text-gray-900">
            Aún no tiene foto principal
          </div>
          <div className="text-xs text-gray-600">
            En el catálogo público se muestra un placeholder hasta que subas la
            foto del frente.
          </div>
        </div>
      </div>
      <a
        href="#fotos"
        className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-amber-600"
      >
        Subir foto ahora
      </a>
    </div>
  )
}

// ------------------------------------------------------------------
// Banner de datos pendientes (SOAT, RTM, etc.)
// ------------------------------------------------------------------
function PendingDataBanner({
  vehicle,
  onUpdated,
  onError,
}: {
  vehicle: Vehicle
  onUpdated: () => void
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const missing: string[] = []
  if (!vehicle.soat_expiry) missing.push('SOAT')
  if (!vehicle.rtm_expiry) missing.push('RTM')

  if (missing.length === 0) return null

  return (
    <>
      <div className="mx-6 mt-4 flex flex-col gap-3 rounded-md border-l-[3px] border-l-amber-400 border-y border-r border-gray-200 bg-amber-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
            !
          </span>
          <div>
            <div className="text-sm font-bold text-gray-900">
              Faltan datos por completar
            </div>
            <div className="text-xs text-gray-600">
              Vencimiento de: {missing.join(' · ')}. Sin estas fechas no se
              generan alertas de renovación.
            </div>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-amber-600"
        >
          Completar fechas
        </button>
      </div>

      {editing && (
        <ExpiryDatesModal
          vehicle={vehicle}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            onUpdated()
          }}
          onError={onError}
        />
      )}
    </>
  )
}

function ExpiryDatesModal({
  vehicle,
  onClose,
  onSaved,
  onError,
}: {
  vehicle: Vehicle
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [soat, setSoat] = useState(vehicle.soat_expiry ?? '')
  const [rtm, setRtm] = useState(vehicle.rtm_expiry ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!soat && !rtm) {
      onError('Ingresa al menos una fecha')
      return
    }
    setSaving(true)
    try {
      const patch: Record<string, string | null> = {}
      if (soat) patch.soat_expiry = soat
      if (rtm) patch.rtm_expiry = rtm
      const { error } = await supabase
        .from('vehicles')
        .update(patch)
        .eq('id', vehicle.id)
      if (error) throw error

      // Regenerar alertas SOAT/RTM con las nuevas fechas
      await syncVehicleExpiryAlerts({
        id: vehicle.id,
        plate: vehicle.plate,
        soat_expiry: soat || vehicle.soat_expiry,
        rtm_expiry: rtm || vehicle.rtm_expiry,
      })

      onSaved()
    } catch (e: unknown) {
      onError(
        e instanceof Error ? e.message : 'No se pudieron guardar las fechas'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
          Vehículo {vehicle.plate}
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          Completar fechas de documentos
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Al guardar, se generan automáticamente las alertas de vencimiento a
          30, 15, 7 y 1 día antes.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Vencimiento SOAT
            </label>
            <input
              type="date"
              value={soat}
              onChange={(e) => setSoat(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Vencimiento RTM
            </label>
            <input
              type="date"
              value={rtm}
              onChange={(e) => setRtm(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-[#C8152A] disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar fechas'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CameraIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
