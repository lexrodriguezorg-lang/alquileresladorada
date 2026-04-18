import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import BrandMark from '../components/BrandMark'
import { syncVehicleExpiryAlerts } from '../lib/alerts'

// ------------------------------------------------------------------
// Pasos
// ------------------------------------------------------------------
const STEPS = [
  { n: 1, title: 'Datos del negocio', short: 'Negocio' },
  { n: 2, title: 'Políticas', short: 'Políticas' },
  { n: 3, title: 'Métodos de pago', short: 'Pagos' },
  { n: 4, title: 'Flota de vehículos', short: 'Flota' },
  { n: 5, title: 'Resumen', short: 'Resumen' },
] as const

// ------------------------------------------------------------------
// Tipos locales para el estado del wizard
// ------------------------------------------------------------------
type Social = { instagram?: string; facebook?: string; tiktok?: string }
type Policies = {
  requirements?: string[]
  deposit_amount?: number
  deposit_note?: string
  zones?: string
  fuel_policy?: string
  mileage_policy?: string
  cancellation_policy?: string
}
type PaymentMethod = {
  type: string
  label: string
  number?: string
  holder?: string
}
type Config = {
  id?: string
  business_name?: string
  business_address?: string
  business_city?: string
  schedule_text?: string
  phone_primary?: string
  phone_secondary?: string
  whatsapp?: string
  email?: string
  social?: Social
  policies?: Policies
  payment_methods?: PaymentMethod[]
  onboarding_step?: number
  onboarding_completed?: boolean
}

// ------------------------------------------------------------------
// Shell del wizard
// ------------------------------------------------------------------
export default function Onboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configId, setConfigId] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>({})
  const [step, setStep] = useState<number>(1)

  // Cargar configuración existente
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (error && error.code !== 'PGRST116') {
        setError(error.message)
      } else if (data) {
        setConfigId(data.id)
        setConfig(data as Config)
        if (data.onboarding_completed) {
          // Ya completado: redirigir al dashboard
          navigate('/', { replace: true })
          return
        }
        setStep(Math.max(1, Math.min(5, data.onboarding_step ?? 1)))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [navigate])

  // Guardar parche y avanzar
  const saveStep = useCallback(
    async (patch: Partial<Config>, nextStep: number) => {
      setSaving(true)
      setError(null)
      const payload = { ...patch, onboarding_step: nextStep }
      try {
        if (!configId) {
          const { data, error } = await supabase
            .from('business_config')
            .insert(payload)
            .select('*')
            .single()
          if (error) throw error
          setConfigId(data.id)
          setConfig(data as Config)
        } else {
          const { data, error } = await supabase
            .from('business_config')
            .update(payload)
            .eq('id', configId)
            .select('*')
            .single()
          if (error) throw error
          setConfig(data as Config)
        }
        setStep(nextStep)
        window.scrollTo(0, 0)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setSaving(false)
      }
    },
    [configId]
  )

  const handleBack = () => setStep((s) => Math.max(1, s - 1))

  const handleFinish = async () => {
    if (!configId) return navigate('/', { replace: true })
    setSaving(true)
    const { error } = await supabase
      .from('business_config')
      .update({ onboarding_completed: true, onboarding_step: 5 })
      .eq('id', configId)
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    navigate('/', { replace: true })
  }

  const handlePause = () => navigate('/', { replace: true })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-500">
        Cargando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <BrandMark size="sm" />
          <button
            onClick={handlePause}
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900"
          >
            Guardar y salir →
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <ProgressBar step={step} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-auto mt-4 max-w-3xl px-6">
          <div className="rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {error}
          </div>
        </div>
      )}

      {/* Body */}
      <main className="mx-auto max-w-3xl px-6 py-8 pb-24">
        {step === 1 && (
          <Step1Business
            defaults={config}
            saving={saving}
            onNext={(patch) => saveStep(patch, 2)}
          />
        )}
        {step === 2 && (
          <Step2Policies
            defaults={config}
            saving={saving}
            onNext={(patch) => saveStep(patch, 3)}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <Step3Payments
            defaults={config}
            saving={saving}
            onNext={(patch) => saveStep(patch, 4)}
            onBack={handleBack}
          />
        )}
        {step === 4 && (
          <Step4Fleet
            onBack={handleBack}
            onNext={() => saveStep({}, 5)}
          />
        )}
        {step === 5 && (
          <Summary
            config={config}
            saving={saving}
            onBack={handleBack}
            onFinish={handleFinish}
          />
        )}
      </main>
    </div>
  )
}

// ------------------------------------------------------------------
// Indicador de progreso
// ------------------------------------------------------------------
function ProgressBar({ step }: { step: number }) {
  const current = STEPS.find((s) => s.n === step) ?? STEPS[0]
  const pct = (step / STEPS.length) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          Configuración inicial
        </div>
        <div className="text-xs font-semibold text-gray-500">
          Paso {step} de {STEPS.length}
        </div>
      </div>
      <h1
        className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
        style={{ fontFamily: 'var(--font-brand)' }}
      >
        {current.title}
      </h1>

      {/* Barra */}
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps dots */}
      <ol className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {STEPS.map((s) => {
          const active = s.n === step
          const done = s.n < step
          return (
            <li
              key={s.n}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                done
                  ? 'border-brand/20 bg-brand-soft text-brand'
                  : active
                    ? 'border-brand bg-brand text-white'
                    : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                  done
                    ? 'bg-brand text-white'
                    : active
                      ? 'bg-white text-brand'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              {s.short}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ------------------------------------------------------------------
// UI primitives
// ------------------------------------------------------------------
const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

function Field({
  label,
  hint,
  error,
  children,
  full,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-brand">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
}

function WizardActions({
  onBack,
  nextLabel = 'Continuar',
  saving,
}: {
  onBack?: () => void
  nextLabel?: string
  saving?: boolean
}) {
  return (
    <div className="col-span-2 mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#C8152A] disabled:opacity-60"
      >
        {saving ? 'Guardando…' : nextLabel + ' →'}
      </button>
    </div>
  )
}

// ================================================================
// PASO 1 · Datos del negocio
// ================================================================
type Step1Values = {
  business_name: string
  business_address: string
  business_city: string
  schedule_text: string
  phone_primary: string
  phone_secondary: string
  whatsapp: string
  email: string
  instagram: string
  facebook: string
  tiktok: string
}

function Step1Business({
  defaults,
  saving,
  onNext,
}: {
  defaults: Config
  saving: boolean
  onNext: (patch: Partial<Config>) => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step1Values>({
    defaultValues: {
      business_name: defaults.business_name ?? 'Alquiler de Motos y Carros La 14',
      business_address: defaults.business_address ?? '',
      business_city: defaults.business_city ?? 'La Dorada',
      schedule_text: defaults.schedule_text ?? 'Lunes a sábado · 7:00 am – 7:00 pm',
      phone_primary: defaults.phone_primary ?? '',
      phone_secondary: defaults.phone_secondary ?? '',
      whatsapp: defaults.whatsapp ?? '573223720785',
      email: defaults.email ?? '',
      instagram: defaults.social?.instagram ?? '',
      facebook: defaults.social?.facebook ?? '',
      tiktok: defaults.social?.tiktok ?? '',
    },
  })

  const submit = (v: Step1Values) => {
    if (!v.business_name?.trim()) return
    onNext({
      business_name: v.business_name.trim(),
      business_address: v.business_address.trim() || undefined,
      business_city: v.business_city.trim() || undefined,
      schedule_text: v.schedule_text.trim() || undefined,
      phone_primary: v.phone_primary.trim() || undefined,
      phone_secondary: v.phone_secondary.trim() || undefined,
      whatsapp: v.whatsapp.trim() || undefined,
      email: v.email.trim() || undefined,
      social: {
        instagram: v.instagram.trim() || undefined,
        facebook: v.facebook.trim() || undefined,
        tiktok: v.tiktok.trim() || undefined,
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-white p-6 md:p-8"
    >
      <p className="col-span-2 text-sm text-gray-600">
        Esta información aparece en la landing pública, en los recibos y en la
        factura PDF.
      </p>

      <Field
        label="Nombre del negocio"
        full
        error={errors.business_name && 'Requerido'}
      >
        <input
          {...register('business_name', { required: true })}
          className={inputCls}
        />
      </Field>

      <Field label="Dirección" full>
        <input {...register('business_address')} className={inputCls} placeholder="Cll 14 #..." />
      </Field>

      <Field label="Ciudad">
        <input {...register('business_city')} className={inputCls} />
      </Field>
      <Field label="Horario de atención">
        <input
          {...register('schedule_text')}
          className={inputCls}
          placeholder="Lun-Sáb 7am – 7pm"
        />
      </Field>

      <Field label="Teléfono principal">
        <input
          {...register('phone_primary')}
          className={inputCls}
          placeholder="3XX XXX XXXX"
        />
      </Field>
      <Field label="Teléfono alterno">
        <input {...register('phone_secondary')} className={inputCls} />
      </Field>

      <Field label="WhatsApp" hint="Formato: 57 + número, sin espacios">
        <input
          {...register('whatsapp')}
          className={inputCls}
          placeholder="573XXXXXXXXX"
        />
      </Field>
      <Field label="Correo">
        <input type="email" {...register('email')} className={inputCls} />
      </Field>

      <div className="col-span-2 mt-2 rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          Redes sociales
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            {...register('instagram')}
            className={inputCls}
            placeholder="@instagram"
          />
          <input
            {...register('facebook')}
            className={inputCls}
            placeholder="fb.com/..."
          />
          <input
            {...register('tiktok')}
            className={inputCls}
            placeholder="@tiktok"
          />
        </div>
      </div>

      <WizardActions saving={saving} />
    </form>
  )
}

// ================================================================
// PASO 2 · Políticas (versión completa)
// ================================================================
type FuelType = 'lleno' | 'vacio' | 'medio'
type MileageType = 'limitado' | 'libre'
type ZoneType = 'local' | 'departamental' | 'nacional'

type Step2Values = {
  requirements: string
  doc_cedula: boolean
  doc_licencia: boolean
  doc_foto: boolean
  doc_referencias: boolean
  doc_otro: boolean
  doc_otro_text: string
  deposit_policy: string
  fuel_policy_type: FuelType
  fuel_policy_note: string
  mileage_policy_type: MileageType
  mileage_limit: string
  zones_type: ZoneType
  zones_exceptions: string
  cancellation_policy: string
  late_return_hourly: string
  late_return_daily: string
  damages_policy: string
}

function Step2Policies({
  defaults,
  saving,
  onNext,
  onBack,
}: {
  defaults: Config
  saving: boolean
  onNext: (patch: Partial<Config>) => void
  onBack: () => void
}) {
  // 'p' viene como jsonb arbitrario; lo casteamos
  const p = (defaults.policies as Record<string, unknown>) ?? {}
  const docs = (p.documents as string[]) ?? ['cedula', 'licencia']

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Values>({
    defaultValues: {
      requirements: (p.requirements as string) ?? '',
      doc_cedula: docs.includes('cedula'),
      doc_licencia: docs.includes('licencia'),
      doc_foto: docs.includes('foto_cliente'),
      doc_referencias: docs.includes('referencias'),
      doc_otro: !!p.documents_other,
      doc_otro_text: (p.documents_other as string) ?? '',
      deposit_policy: (p.deposit_policy as string) ?? '',
      fuel_policy_type: (p.fuel_policy_type as FuelType) ?? 'lleno',
      fuel_policy_note: (p.fuel_policy_note as string) ?? '',
      mileage_policy_type: (p.mileage_policy_type as MileageType) ?? 'libre',
      mileage_limit: p.mileage_limit ? String(p.mileage_limit) : '',
      zones_type: (p.zones_type as ZoneType) ?? 'local',
      zones_exceptions: (p.zones_exceptions as string) ?? '',
      cancellation_policy: (p.cancellation_policy as string) ?? '',
      late_return_hourly: p.late_return_hourly
        ? String(p.late_return_hourly)
        : '',
      late_return_daily: p.late_return_daily
        ? String(p.late_return_daily)
        : '',
      damages_policy: (p.damages_policy as string) ?? '',
    },
  })

  const mileageType = watch('mileage_policy_type')
  const docOtro = watch('doc_otro')
  const anyDoc =
    watch('doc_cedula') ||
    watch('doc_licencia') ||
    watch('doc_foto') ||
    watch('doc_referencias') ||
    watch('doc_otro')

  const submit = (v: Step2Values) => {
    if (!anyDoc) return
    const documents: string[] = []
    if (v.doc_cedula) documents.push('cedula')
    if (v.doc_licencia) documents.push('licencia')
    if (v.doc_foto) documents.push('foto_cliente')
    if (v.doc_referencias) documents.push('referencias')
    if (v.doc_otro && v.doc_otro_text.trim()) documents.push('otro')

    onNext({
      policies: {
        requirements: v.requirements.trim(),
        documents,
        documents_other: v.doc_otro ? v.doc_otro_text.trim() : undefined,
        deposit_policy: v.deposit_policy.trim(),
        fuel_policy_type: v.fuel_policy_type,
        fuel_policy_note: v.fuel_policy_note.trim() || undefined,
        mileage_policy_type: v.mileage_policy_type,
        mileage_limit:
          v.mileage_policy_type === 'limitado' && v.mileage_limit
            ? Number(v.mileage_limit)
            : undefined,
        zones_type: v.zones_type,
        zones_exceptions: v.zones_exceptions.trim() || undefined,
        cancellation_policy: v.cancellation_policy.trim(),
        late_return_hourly: Number(v.late_return_hourly) || 0,
        late_return_daily: Number(v.late_return_daily) || 0,
        damages_policy: v.damages_policy.trim(),
      } as unknown as Policies,
    })
  }

  const checkbox =
    'flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-brand'

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-2 gap-5 rounded-2xl border border-gray-200 bg-white p-6 md:p-8"
    >
      <p className="col-span-2 text-sm text-gray-600">
        Define las reglas claras del negocio. Esto protege a tus clientes y a
        ti.
      </p>

      {/* ---------- Requisitos ---------- */}
      <Field
        label="Requisitos mínimos del cliente"
        full
        error={errors.requirements?.message}
      >
        <textarea
          {...register('requirements', {
            required: 'Describe los requisitos mínimos',
            minLength: { value: 10, message: 'Mínimo 10 caracteres' },
          })}
          placeholder="Edad mínima, antigüedad licencia, tipo de uso permitido…"
          className={`${inputCls} min-h-[90px]`}
        />
      </Field>

      {/* ---------- Documentos ---------- */}
      <div className="col-span-2">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Documentos que se piden al arrendar
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={checkbox}>
            <input
              type="checkbox"
              {...register('doc_cedula')}
              className="accent-[#E8192C]"
            />
            Cédula
          </label>
          <label className={checkbox}>
            <input
              type="checkbox"
              {...register('doc_licencia')}
              className="accent-[#E8192C]"
            />
            Licencia de conducción
          </label>
          <label className={checkbox}>
            <input
              type="checkbox"
              {...register('doc_foto')}
              className="accent-[#E8192C]"
            />
            Foto del cliente
          </label>
          <label className={checkbox}>
            <input
              type="checkbox"
              {...register('doc_referencias')}
              className="accent-[#E8192C]"
            />
            Referencias
          </label>
          <label className={`${checkbox} sm:col-span-2`}>
            <input
              type="checkbox"
              {...register('doc_otro')}
              className="accent-[#E8192C]"
            />
            Otro
            {docOtro && (
              <input
                {...register('doc_otro_text', {
                  required: docOtro ? '¿Cuál?' : false,
                })}
                className={`${inputCls} ml-2 flex-1`}
                placeholder="Especifica…"
              />
            )}
          </label>
        </div>
        {!anyDoc && (
          <p className="mt-1 text-xs text-brand">
            Selecciona al menos un documento.
          </p>
        )}
        {errors.doc_otro_text && (
          <p className="mt-1 text-xs text-brand">
            {errors.doc_otro_text.message}
          </p>
        )}
      </div>

      {/* ---------- Depósito ---------- */}
      <Field
        label="Política de depósito"
        full
        hint="Cuándo se cobra, cómo, cuándo se devuelve"
        error={errors.deposit_policy?.message}
      >
        <textarea
          {...register('deposit_policy', {
            required: 'Describe la política de depósito',
            minLength: { value: 10, message: 'Mínimo 10 caracteres' },
          })}
          className={`${inputCls} min-h-[80px]`}
          placeholder="Ej: Depósito de $100.000 al entregar el vehículo, devuelto en efectivo al retorno si no hay daños…"
        />
      </Field>

      {/* ---------- Combustible ---------- */}
      <Field label="Política de combustible" error={errors.fuel_policy_type?.message}>
        <select
          {...register('fuel_policy_type', { required: true })}
          className={inputCls}
        >
          <option value="lleno">Tanque lleno (entrega y devuelve)</option>
          <option value="medio">Medio tanque</option>
          <option value="vacio">Vacío</option>
        </select>
      </Field>
      <Field label="Aclaración (opcional)">
        <input
          {...register('fuel_policy_note')}
          className={inputCls}
          placeholder="Ej: Se cobra recargo por faltante"
        />
      </Field>

      {/* ---------- Kilometraje ---------- */}
      <Field label="Política de kilometraje">
        <select
          {...register('mileage_policy_type', { required: true })}
          className={inputCls}
        >
          <option value="libre">Sin límite (libre)</option>
          <option value="limitado">Limitado por día</option>
        </select>
      </Field>
      <Field
        label="Límite (km/día)"
        hint={mileageType === 'libre' ? 'No aplica' : ''}
        error={errors.mileage_limit?.message}
      >
        <input
          type="number"
          {...register('mileage_limit', {
            validate: (v) =>
              mileageType !== 'limitado' ||
              (Number(v) > 0 ? true : 'Indica los km por día'),
          })}
          disabled={mileageType !== 'limitado'}
          placeholder={mileageType === 'limitado' ? '200' : '—'}
          className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
        />
      </Field>

      {/* ---------- Zonas ---------- */}
      <Field label="Zonas permitidas">
        <select
          {...register('zones_type', { required: true })}
          className={inputCls}
        >
          <option value="local">Solo La Dorada</option>
          <option value="departamental">Caldas (departamental)</option>
          <option value="nacional">Nacional</option>
        </select>
      </Field>
      <Field label="Excepciones (opcional)">
        <input
          {...register('zones_exceptions')}
          className={inputCls}
          placeholder="Ej: prohibido salir a vías destapadas"
        />
      </Field>

      {/* ---------- Cancelación ---------- */}
      <Field
        label="Política de cancelación"
        full
        error={errors.cancellation_policy?.message}
      >
        <textarea
          {...register('cancellation_policy', {
            required: 'Describe la política de cancelación',
            minLength: { value: 10, message: 'Mínimo 10 caracteres' },
          })}
          className={`${inputCls} min-h-[70px]`}
          placeholder="Ej: cancelación sin costo hasta 24h antes de la entrega…"
        />
      </Field>

      {/* ---------- Retraso en devolución ---------- */}
      <div className="col-span-2 rounded-xl border border-gray-200 bg-[#F9FAFB] p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
          Retraso en la devolución
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Hora extra (COP)"
            error={errors.late_return_hourly?.message}
          >
            <input
              type="number"
              {...register('late_return_hourly', {
                required: 'Requerido',
                min: { value: 0, message: 'No puede ser negativo' },
              })}
              className={inputCls}
              placeholder="5000"
            />
          </Field>
          <Field
            label="Día extra (COP)"
            error={errors.late_return_daily?.message}
          >
            <input
              type="number"
              {...register('late_return_daily', {
                required: 'Requerido',
                min: { value: 0, message: 'No puede ser negativo' },
              })}
              className={inputCls}
              placeholder="60000"
            />
          </Field>
        </div>
      </div>

      {/* ---------- Daños ---------- */}
      <Field
        label="Política de daños y siniestros"
        full
        error={errors.damages_policy?.message}
      >
        <textarea
          {...register('damages_policy', {
            required: 'Describe la política de daños',
            minLength: { value: 10, message: 'Mínimo 10 caracteres' },
          })}
          className={`${inputCls} min-h-[80px]`}
          placeholder="Ej: ante choque o pérdida, el cliente cubre deducible y reposición…"
        />
      </Field>

      <WizardActions onBack={onBack} saving={saving} />
    </form>
  )
}

// ================================================================
// PASO 3 · Métodos de pago
// ================================================================
type Step3Values = {
  methods: PaymentMethod[]
}

function Step3Payments({
  defaults,
  saving,
  onNext,
  onBack,
}: {
  defaults: Config
  saving: boolean
  onNext: (patch: Partial<Config>) => void
  onBack: () => void
}) {
  const defaultMethods: PaymentMethod[] = defaults.payment_methods?.length
    ? defaults.payment_methods
    : [
        { type: 'nequi', label: 'Nequi', number: '' },
        { type: 'daviplata', label: 'Daviplata', number: '' },
        { type: 'bancolombia', label: 'Bancolombia (ahorros)', number: '' },
        { type: 'efectivo', label: 'Efectivo', number: '' },
      ]
  const { register, control, handleSubmit } = useForm<Step3Values>({
    defaultValues: { methods: defaultMethods },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'methods' })

  const submit = (v: Step3Values) => {
    const cleaned = v.methods
      .map((m) => ({
        type: m.type?.trim() || 'otro',
        label: m.label?.trim() || '—',
        number: m.number?.trim() || undefined,
        holder: m.holder?.trim() || undefined,
      }))
      .filter((m) => m.label)
    onNext({ payment_methods: cleaned })
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 md:p-8"
    >
      <p className="text-sm text-gray-600">
        Qué medios aceptas y con qué número o cuenta. Esta info se muestra al
        cliente antes de confirmar la reserva.
      </p>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div
            key={f.id}
            className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-[#F9FAFB] p-4 sm:grid-cols-[auto_1fr_1fr_1fr_auto]"
          >
            <select
              {...register(`methods.${i}.type` as const)}
              className={`${inputCls} sm:max-w-[150px]`}
            >
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="bancolombia">Bancolombia</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
            <input
              {...register(`methods.${i}.label` as const)}
              placeholder="Nombre mostrado"
              className={inputCls}
            />
            <input
              {...register(`methods.${i}.number` as const)}
              placeholder="Número / cuenta"
              className={inputCls}
            />
            <input
              {...register(`methods.${i}.holder` as const)}
              placeholder="Titular (opcional)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ type: 'otro', label: '', number: '' })}
        className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:border-brand hover:text-brand"
      >
        + Agregar otro método de pago
      </button>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#C8152A] disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Continuar →'}
        </button>
      </div>
    </form>
  )
}

// ================================================================
// PASO 4 · Flota
// ================================================================
type VehicleRow = {
  id: string
  plate: string
  brand: string
  model: string
  year: number | null
  vehicle_type: string
  daily_rate: number
  status: string
}

type VehicleFormValues = {
  vehicle_type: 'moto' | 'carro'
  brand: string
  model: string
  year: string
  plate: string
  color: string
  engine: string // cc para moto, litros para carro
  mileage_km: string
  daily_rate: string
  weekly_rate: string
  monthly_rate: string
  specific_deposit: string
  soat_expiry: string
  rtm_expiry: string
  requirements_specific: string
  zone_restrictions: string
  notes: string
}

// Placa permisiva: 2-3 letras + 2-4 dígitos + letra opcional al final
// Cubre formatos modernos (ABC-123, ABC-12D) y placas antiguas (BHB-43, etc.)
const PLATE_REGEX = /^[A-Z]{2,3}-?\d{2,4}[A-Z]?$/
const todayISO = () => new Date().toISOString().split('T')[0]

function Step4Fleet({
  onBack,
  onNext,
}: {
  onBack: () => void
  onNext: () => void
}) {
  const [rows, setRows] = useState<VehicleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const COP = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }),
    []
  )

  const loadRows = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, year, vehicle_type, daily_rate, status')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows((data ?? []) as VehicleRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
      <p className="text-sm text-gray-600">
        Agrega los vehículos disponibles para alquilar. Podrás cargar las
        fotos después desde el panel de cada vehículo.
      </p>

      {/* Lista de vehículos ya agregados */}
      <div className="space-y-2">
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Cargando…</div>
        )}
        {!loading && rows.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-[#F9FAFB] px-6 py-10 text-center text-sm text-gray-500">
            Aún no has agregado vehículos.
          </div>
        )}
        {rows.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-gray-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  {v.plate}
                </span>
                <span
                  className="text-base font-bold text-gray-900"
                  style={{ fontFamily: 'var(--font-brand)' }}
                >
                  {v.brand} {v.model}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {v.year ?? '—'} · {v.vehicle_type} · {v.status}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-black text-brand"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {COP.format(Number(v.daily_rate))}
                <span className="text-xs font-medium text-gray-500"> /día</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          {error}
        </div>
      )}

      {/* Form inline */}
      {showForm ? (
        <InlineVehicleForm
          onCancel={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await loadRows()
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-bold uppercase tracking-wider text-gray-600 hover:border-brand hover:text-brand"
        >
          + Agregar {rows.length === 0 ? 'primer' : 'otro'} vehículo
        </button>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          onClick={onBack}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Atrás
        </button>
        <button
          onClick={onNext}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#C8152A]"
        >
          {rows.length === 0 ? 'Omitir por ahora →' : 'Ver resumen →'}
        </button>
      </div>
    </div>
  )
}

function InlineVehicleForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void
  onSaved: () => void
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    defaultValues: {
      vehicle_type: 'moto',
      brand: '',
      model: '',
      year: '',
      plate: '',
      color: '',
      engine: '',
      mileage_km: '',
      daily_rate: '',
      weekly_rate: '',
      monthly_rate: '',
      specific_deposit: '',
      soat_expiry: '',
      rtm_expiry: '',
      requirements_specific: '',
      zone_restrictions: '',
      notes: '',
    },
  })
  const type = watch('vehicle_type')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (v: VehicleFormValues) => {
    setErr(null)
    setSaving(true)
    try {
      const num = (s: string) => {
        const n = Number(String(s).trim())
        return Number.isFinite(n) && n >= 0 ? n : null
      }
      const numPos = (s: string) => {
        const n = Number(String(s).trim())
        return Number.isFinite(n) && n > 0 ? n : null
      }
      const engineNum = num(v.engine)

      const payload: Record<string, unknown> = {
        vehicle_type: v.vehicle_type,
        brand: v.brand.trim(),
        model: v.model.trim(),
        year: Number(v.year),
        plate: v.plate.trim().toUpperCase(),
        color: v.color.trim(),
        mileage_km: num(v.mileage_km),
        daily_rate: Number(v.daily_rate),
        weekly_rate: numPos(v.weekly_rate),
        monthly_rate: numPos(v.monthly_rate),
        specific_deposit: numPos(v.specific_deposit),
        soat_expiry: v.soat_expiry || null,
        rtm_expiry: v.rtm_expiry || null,
        requirements_specific: v.requirements_specific.trim() || null,
        zone_restrictions: v.zone_restrictions.trim() || null,
        notes: v.notes.trim() || null,
        status: 'disponible',
      }
      if (v.vehicle_type === 'moto') {
        payload.engine_cc = engineNum
        payload.engine_liters = null
      } else {
        // Para carros: el campo "Motor" se interpreta como litros
        payload.engine_liters = engineNum
        payload.engine_cc = null
      }

      const { data, error } = await supabase
        .from('vehicles')
        .insert(payload)
        .select('id, plate, soat_expiry, rtm_expiry')
        .single()
      if (error) throw error

      // Genera alertas SOAT/RTM (no bloquea si falla)
      try {
        await syncVehicleExpiryAlerts(data)
      } catch (alertErr) {
        console.warn('No se pudieron crear las alertas:', alertErr)
      }

      reset()
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error guardando el vehículo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="space-y-5 rounded-xl border border-brand/30 bg-brand-soft/40 p-5"
    >
      {/* ---------- Datos básicos ---------- */}
      <FormSection title="Datos básicos">
        <Field label="Tipo">
          <select {...register('vehicle_type')} className={inputCls}>
            <option value="moto">Moto</option>
            <option value="carro">Carro</option>
          </select>
        </Field>
        <Field label="Color" error={errors.color?.message}>
          <input
            {...register('color', { required: 'Color requerido' })}
            className={inputCls}
            placeholder="Negro, Rojo…"
          />
        </Field>
        <Field label="Marca" error={errors.brand?.message}>
          <input
            {...register('brand', { required: 'Marca requerida' })}
            className={inputCls}
            placeholder="Yamaha, Honda…"
          />
        </Field>
        <Field label="Modelo" error={errors.model?.message}>
          <input
            {...register('model', { required: 'Modelo requerido' })}
            className={inputCls}
            placeholder="FZ 2.0, Spark GT…"
          />
        </Field>
        <Field label="Año" error={errors.year?.message}>
          <input
            type="number"
            {...register('year', {
              required: 'Año requerido',
              valueAsNumber: false,
              min: { value: 1990, message: 'Año mínimo 1990' },
              max: { value: 2026, message: 'Año máximo 2026' },
            })}
            className={inputCls}
            placeholder="2023"
          />
        </Field>
        <Field
          label="Placa"
          hint="Formato: ABC-123 o ABC-12D"
          error={errors.plate?.message}
        >
          <input
            {...register('plate', {
              required: 'Placa requerida',
              setValueAs: (v) =>
                typeof v === 'string' ? v.trim().toUpperCase() : v,
              validate: (val) => {
                const p = String(val).trim().toUpperCase()
                return PLATE_REGEX.test(p)
                  ? true
                  : 'Formato inválido (ej: ABC-123 o ABC12D)'
              },
            })}
            className={`${inputCls} uppercase`}
            placeholder="ABC-123"
          />
        </Field>
      </FormSection>

      {/* ---------- Características ---------- */}
      <FormSection title="Características">
        <Field
          label={type === 'moto' ? 'Cilindraje (cc)' : 'Motor (litros)'}
          hint={type === 'moto' ? 'Ej: 125, 250' : 'Ej: 1.6, 2.0'}
          error={errors.engine?.message}
        >
          <input
            type="number"
            step={type === 'moto' ? '1' : '0.1'}
            {...register('engine', {
              required: type === 'moto' ? 'Cilindraje requerido' : 'Motor requerido',
              min: { value: 0.1, message: 'Valor inválido' },
            })}
            className={inputCls}
            placeholder={type === 'moto' ? '125' : '1.6'}
          />
        </Field>
        <Field label="Kilometraje actual" error={errors.mileage_km?.message}>
          <input
            type="number"
            {...register('mileage_km', {
              required: 'Kilometraje requerido',
              min: { value: 0, message: 'No puede ser negativo' },
            })}
            className={inputCls}
            placeholder="12300"
          />
        </Field>
      </FormSection>

      {/* ---------- Precios ---------- */}
      <FormSection title="Precios">
        <Field
          label="Precio por día (COP)"
          error={errors.daily_rate?.message}
        >
          <input
            type="number"
            {...register('daily_rate', {
              required: 'Precio por día requerido',
              min: { value: 1, message: 'Debe ser mayor a 0' },
            })}
            className={inputCls}
            placeholder="50000"
          />
        </Field>
        <Field
          label="Precio por semana (opcional)"
          error={errors.weekly_rate?.message}
        >
          <input
            type="number"
            {...register('weekly_rate', {
              min: { value: 0, message: 'Inválido' },
            })}
            className={inputCls}
            placeholder="300000"
          />
        </Field>
        <Field
          label="Precio por mes (opcional)"
          error={errors.monthly_rate?.message}
        >
          <input
            type="number"
            {...register('monthly_rate', {
              min: { value: 0, message: 'Inválido' },
            })}
            className={inputCls}
            placeholder="1100000"
          />
        </Field>
        <Field
          label="Depósito específico (opcional)"
          hint="Si difiere del general"
          error={errors.specific_deposit?.message}
        >
          <input
            type="number"
            {...register('specific_deposit', {
              min: { value: 0, message: 'Inválido' },
            })}
            className={inputCls}
            placeholder="100000"
          />
        </Field>
      </FormSection>

      {/* ---------- Vencimientos legales ---------- */}
      <FormSection title="Vencimientos">
        <Field
          label="Fecha vencimiento SOAT"
          hint="Se crearán alertas a 30, 15, 7 y 1 día antes"
          error={errors.soat_expiry?.message}
        >
          <input
            type="date"
            min={todayISO()}
            {...register('soat_expiry', {
              required: 'Fecha SOAT requerida',
            })}
            className={inputCls}
          />
        </Field>
        <Field
          label="Fecha vencimiento RTM"
          hint="Revisión Técnico-Mecánica"
          error={errors.rtm_expiry?.message}
        >
          <input
            type="date"
            min={todayISO()}
            {...register('rtm_expiry', {
              required: 'Fecha RTM requerida',
            })}
            className={inputCls}
          />
        </Field>
      </FormSection>

      {/* ---------- Opcionales ---------- */}
      <FormSection title="Información adicional (opcional)">
        <Field label="Requisitos específicos" full>
          <textarea
            {...register('requirements_specific')}
            className={`${inputCls} min-h-[60px]`}
            placeholder="Ej: solo conductores con +2 años de licencia"
          />
        </Field>
        <Field label="Restricciones de zona" full>
          <textarea
            {...register('zone_restrictions')}
            className={`${inputCls} min-h-[60px]`}
            placeholder="Ej: no apto para carreteras sin pavimentar"
          />
        </Field>
        <Field label="Observaciones" full>
          <textarea
            {...register('notes')}
            className={`${inputCls} min-h-[60px]`}
            placeholder="Notas internas sobre el vehículo"
          />
        </Field>
      </FormSection>

      {err && (
        <div className="rounded-md border-l-[3px] border-l-brand border-y border-r border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
          {err}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-[#C8152A] disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Agregar vehículo'}
        </button>
      </div>
    </form>
  )
}

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

// ================================================================
// PASO 5 · Resumen
// ================================================================
function Summary({
  config,
  saving,
  onBack,
  onFinish,
}: {
  config: Config
  saving: boolean
  onBack: () => void
  onFinish: () => void
}) {
  const COP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
  const p = config.policies ?? {}
  const methods = config.payment_methods ?? []
  const [fleetCount, setFleetCount] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .then((res) => setFleetCount(res.count ?? 0))
  }, [])

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
        <div
          className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          Revisa la configuración
        </div>

        <Block title="Negocio">
          <Row k="Nombre" v={config.business_name} />
          <Row k="Dirección" v={config.business_address} />
          <Row k="Ciudad" v={config.business_city} />
          <Row k="Horario" v={config.schedule_text} />
          <Row k="Teléfono" v={config.phone_primary} />
          <Row k="WhatsApp" v={config.whatsapp} />
          <Row k="Correo" v={config.email} />
        </Block>

        <Block title="Políticas">
          <Row k="Requisitos" v={(p as Record<string, unknown>).requirements as string} />
          <Row
            k="Documentos"
            v={
              ((p as Record<string, unknown>).documents as string[] | undefined)
                ?.map((d) =>
                  d === 'cedula'
                    ? 'Cédula'
                    : d === 'licencia'
                      ? 'Licencia'
                      : d === 'foto_cliente'
                        ? 'Foto'
                        : d === 'referencias'
                          ? 'Referencias'
                          : d === 'otro'
                            ? ((p as Record<string, unknown>).documents_other as string) || 'Otro'
                            : d
                )
                .join(' · ')
            }
          />
          <Row k="Depósito" v={(p as Record<string, unknown>).deposit_policy as string} />
          <Row
            k="Combustible"
            v={
              [
                summaryFuelLabel((p as Record<string, unknown>).fuel_policy_type as string),
                ((p as Record<string, unknown>).fuel_policy_note as string) || '',
              ]
                .filter(Boolean)
                .join(' — ')
            }
          />
          <Row
            k="Kilometraje"
            v={
              (p as Record<string, unknown>).mileage_policy_type === 'limitado'
                ? `Limitado a ${(p as Record<string, unknown>).mileage_limit as number} km/día`
                : 'Sin límite'
            }
          />
          <Row
            k="Zonas"
            v={
              [
                summaryZoneLabel((p as Record<string, unknown>).zones_type as string),
                ((p as Record<string, unknown>).zones_exceptions as string) || '',
              ]
                .filter(Boolean)
                .join(' — ')
            }
          />
          <Row k="Cancelación" v={(p as Record<string, unknown>).cancellation_policy as string} />
          <Row
            k="Retraso devolución"
            v={`${COP.format(Number((p as Record<string, unknown>).late_return_hourly) || 0)} / hora · ${COP.format(Number((p as Record<string, unknown>).late_return_daily) || 0)} / día`}
          />
          <Row k="Daños y siniestros" v={(p as Record<string, unknown>).damages_policy as string} />
        </Block>

        <Block title="Métodos de pago">
          {methods.length === 0 ? (
            <div className="text-sm text-gray-400">— Sin métodos configurados</div>
          ) : (
            <ul className="space-y-1.5">
              {methods.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-[#F9FAFB] px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-gray-900">{m.label}</span>
                  <span className="font-mono text-gray-700">
                    {m.number || '—'}
                    {m.holder ? ` · ${m.holder}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Flota">
          <div className="text-sm text-gray-700">
            {fleetCount === null ? (
              'Contando…'
            ) : (
              <>
                <span className="font-bold text-gray-900">{fleetCount}</span>{' '}
                vehículo{fleetCount === 1 ? '' : 's'} registrado
                {fleetCount === 1 ? '' : 's'}. Las fotos las cargas desde
                el detalle de cada uno.
              </>
            )}
          </div>
        </Block>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={onBack}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Atrás
        </button>
        <button
          onClick={onFinish}
          disabled={saving}
          className="w-full rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-[#C8152A] disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'Finalizando…' : 'Finalizar configuración'}
        </button>
      </div>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {title}
      </div>
      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        <div className="space-y-1.5 px-4 py-3">{children}</div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k}</dt>
      <dd className="text-right text-gray-800">{v || '—'}</dd>
    </div>
  )
}

function summaryFuelLabel(t?: string) {
  if (t === 'lleno') return 'Tanque lleno'
  if (t === 'vacio') return 'Vacío'
  if (t === 'medio') return 'Medio tanque'
  return ''
}
function summaryZoneLabel(t?: string) {
  if (t === 'local') return 'Solo La Dorada'
  if (t === 'departamental') return 'Departamental (Caldas)'
  if (t === 'nacional') return 'Nacional'
  return ''
}
