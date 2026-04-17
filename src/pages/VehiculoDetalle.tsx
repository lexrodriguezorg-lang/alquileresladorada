import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../lib/database.types'
import PageHeader from '../components/PageHeader'
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

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_auto]">
        {/* ---------- Columna izquierda: fotos ---------- */}
        <section>
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
          <div className="sticky top-4 rounded-xl border border-gray-200 bg-white p-5">
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
              <Row k="Estado" v={vehicle.status} />
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k}</dt>
      <dd className="text-right font-medium text-gray-900">{v}</dd>
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
