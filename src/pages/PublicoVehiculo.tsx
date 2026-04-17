import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import type { Vehicle } from '../lib/database.types'
import { vehicleGallery } from '../lib/vehiclePhoto'
import { BUSINESS_INFO } from '../lib/business'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const bookingSchema = z
  .object({
    full_name: z.string().min(3, 'Nombre completo requerido'),
    document_number: z.string().min(5, 'Documento requerido'),
    phone: z.string().min(7, 'Teléfono requerido'),
    email: z
      .string()
      .optional()
      .refine(
        (s) => !s || s.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
        'Correo inválido'
      ),
    start_date: z.string().min(1, 'Fecha de inicio requerida'),
    end_date: z.string().min(1, 'Fecha de fin requerida'),
    notes: z.string().optional(),
  })
  .refine((v) => new Date(v.end_date) > new Date(v.start_date), {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['end_date'],
  })

type BookingInput = z.infer<typeof bookingSchema>

export default function PublicoVehiculo() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) setNotFound(true)
      else setVehicle(data as Vehicle)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-500">
        Cargando…
      </div>
    )
  }

  if (notFound || !vehicle) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white text-center px-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Vehículo no encontrado
        </h1>
        <p className="text-sm text-gray-600">
          Es posible que el enlace esté roto o el vehículo ya no esté en el
          catálogo.
        </p>
        <Link
          to="/publico"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const gallery = vehicleGallery(vehicle.photos, vehicle.vehicle_type)
  const available = vehicle.status === 'disponible'

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <button
            onClick={() => navigate('/publico')}
            className="text-sm font-semibold text-gray-700 hover:text-brand"
          >
            ← Volver al catálogo
          </button>
          <a
            href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[1.2fr_1fr]">
        {/* ---------- Galería + especificaciones ---------- */}
        <section>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <div className="relative aspect-[4/3] w-full">
              <img
                src={gallery[activePhoto]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="h-full w-full object-cover"
              />
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  available
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-white/90'
                }`}
              >
                {available ? 'Disponible' : 'No disponible'}
              </span>
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`aspect-square overflow-hidden rounded-md border ${
                    activePhoto === i
                      ? 'border-brand ring-2 ring-brand/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8">
            <div
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {vehicle.brand} · {vehicle.vehicle_type}
            </div>
            <h1
              className="mt-1 text-4xl font-black tracking-tight text-gray-900"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {vehicle.model}
            </h1>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Spec label="Año" value={vehicle.year ? String(vehicle.year) : '—'} />
              <Spec
                label="Cilindraje"
                value={vehicle.engine_cc ? `${vehicle.engine_cc} cc` : '—'}
              />
              <Spec
                label="Kilometraje"
                value={
                  vehicle.mileage_km != null
                    ? `${vehicle.mileage_km.toLocaleString('es-CO')} km`
                    : '—'
                }
              />
              <Spec label="Color" value={vehicle.color ?? '—'} />
              <Spec label="Placa" value={vehicle.plate} />
              <Spec label="Estado" value={vehicle.status} capitalize />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Tarifas
            </div>
            <div className="mt-3 divide-y divide-gray-200">
              <RateRow label="Por día" value={vehicle.daily_rate} strong />
              <RateRow label="Por semana" value={vehicle.weekly_rate} />
              <RateRow label="Por mes" value={vehicle.monthly_rate} />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Requisitos
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
              <li>• Cédula vigente</li>
              <li>• Licencia de conducción</li>
              <li>• Comprobante de residencia</li>
              <li>• Depósito de garantía (reembolsable)</li>
              <li>• Edad mínima 21 años</li>
            </ul>
          </div>
        </section>

        {/* ---------- Formulario de reserva ---------- */}
        <aside>
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-brand px-5 py-4 text-white">
              <div
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                Solicita tu reserva
              </div>
              <div
                className="mt-0.5 text-xl font-black tracking-tight"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {COP.format(Number(vehicle.daily_rate))}
                <span className="text-sm font-medium text-white/80">
                  {' '}
                  /día
                </span>
              </div>
            </div>
            <div className="px-5 py-5">
              {submitted ? (
                <SuccessMessage vehicle={vehicle} />
              ) : (
                <BookingForm
                  vehicleId={vehicle.id}
                  disabled={!available}
                  onSuccess={() => setSubmitted(true)}
                />
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

// ------------------------------------------------------------------
// Formulario
// ------------------------------------------------------------------
function BookingForm({
  vehicleId,
  disabled,
  onSuccess,
}: {
  vehicleId: string
  disabled: boolean
  onSuccess: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingInput>({ resolver: zodResolver(bookingSchema) })

  const onSubmit = async (values: BookingInput) => {
    setServerError(null)
    const startAt = new Date(`${values.start_date}T08:00:00`).toISOString()
    const endAt = new Date(`${values.end_date}T18:00:00`).toISOString()

    const { error } = await supabase.rpc('submit_booking_request', {
      p_full_name: values.full_name,
      p_document_number: values.document_number,
      p_phone: values.phone,
      p_email: values.email ?? '',
      p_vehicle_id: vehicleId,
      p_start_at: startAt,
      p_end_at: endAt,
      p_notes: values.notes ?? '',
    })
    if (error) return setServerError(error.message)
    onSuccess()
  }

  const inputCls =
    'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

  if (disabled) {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        Este vehículo no está disponible actualmente. Escríbenos por WhatsApp
        para conocer cuándo vuelve a estar libre.
        <a
          href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
        >
          WhatsApp
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label="Nombre completo" error={errors.full_name?.message}>
        <input
          {...register('full_name')}
          className={inputCls}
          placeholder="Tu nombre y apellido"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cédula" error={errors.document_number?.message}>
          <input
            {...register('document_number')}
            className={inputCls}
            placeholder="Número"
          />
        </Field>
        <Field label="Teléfono" error={errors.phone?.message}>
          <input
            {...register('phone')}
            className={inputCls}
            placeholder="3XX XXX XXXX"
          />
        </Field>
      </div>

      <Field label="Correo (opcional)" error={errors.email?.message}>
        <input
          type="email"
          {...register('email')}
          className={inputCls}
          placeholder="tu@correo.com"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de inicio" error={errors.start_date?.message}>
          <input type="date" {...register('start_date')} className={inputCls} />
        </Field>
        <Field label="Fecha de fin" error={errors.end_date?.message}>
          <input type="date" {...register('end_date')} className={inputCls} />
        </Field>
      </div>

      <Field label="Observaciones (opcional)" error={errors.notes?.message}>
        <textarea
          {...register('notes')}
          className={`${inputCls} min-h-[70px]`}
          placeholder="Uso, ruta, detalles especiales…"
        />
      </Field>

      {serverError && (
        <div className="rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#C8152A] disabled:opacity-60"
      >
        {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
      </button>

      <p className="text-center text-[11px] text-gray-500">
        Al enviar, aceptas ser contactado por WhatsApp para confirmar tu
        reserva.
      </p>
    </form>
  )
}

function SuccessMessage({ vehicle }: { vehicle: Vehicle }) {
  const text = encodeURIComponent(
    `Hola, acabo de enviar una solicitud de reserva por el ${vehicle.brand} ${vehicle.model} (placa ${vehicle.plate}).`
  )
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-white">
        ✓
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">
        ¡Solicitud enviada!
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Te contactaremos por WhatsApp para confirmar disponibilidad, precio
        final y método de pago.
      </p>
      <a
        href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1DAE52]"
      >
        Escribirnos ahora
      </a>
    </div>
  )
}

// ------------------------------------------------------------------
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-brand">{error}</span>}
    </label>
  )
}

function Spec({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-semibold text-gray-900 ${
          capitalize ? 'capitalize' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function RateRow({
  label,
  value,
  strong,
}: {
  label: string
  value: number | null
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span
        className={
          strong
            ? 'font-black text-brand'
            : value
              ? 'font-semibold text-gray-900'
              : 'text-gray-400'
        }
      >
        {value ? COP.format(Number(value)) : '—'}
      </span>
    </div>
  )
}
