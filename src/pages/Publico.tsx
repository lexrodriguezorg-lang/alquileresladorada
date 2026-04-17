import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vehicle, VehicleType } from '../lib/database.types'
import { vehiclePhoto } from '../lib/vehiclePhoto'
import { BUSINESS_INFO } from '../lib/business'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const typeFilters: Array<{ value: VehicleType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'moto', label: 'Motos' },
  { value: 'carro', label: 'Carros' },
  { value: 'camioneta', label: 'Camionetas' },
]

export default function Publico() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<VehicleType | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .neq('status', 'inactivo')
        .order('daily_rate', { ascending: true })
      if (!cancelled) {
        if (error) console.error(error)
        setVehicles((data ?? []) as Vehicle[])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? vehicles
        : vehicles.filter((v) => v.vehicle_type === filter),
    [vehicles, filter]
  )

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />
      <Hero />
      <Catalog
        vehicles={filtered}
        loading={loading}
        filter={filter}
        onFilter={setFilter}
      />
      <HowItWorks />
      <Requirements />
      <Location />
      <PublicFooter />
    </div>
  )
}

// ------------------------------------------------------------------
// NAV
// ------------------------------------------------------------------
function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Brand compact />
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <a href="#catalogo" className="hover:text-gray-900">
            Vehículos
          </a>
          <a href="#como-funciona" className="hover:text-gray-900">
            Cómo funciona
          </a>
          <a href="#requisitos" className="hover:text-gray-900">
            Requisitos
          </a>
          <a href="#ubicacion" className="hover:text-gray-900">
            Ubicación
          </a>
        </nav>
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
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="leading-[1.05]"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      <div
        className={`font-bold uppercase tracking-[0.14em] text-gray-500 ${
          compact ? 'text-[10px]' : 'text-[12px]'
        }`}
      >
        Alquiler de
      </div>
      <div
        className={`font-black uppercase tracking-[0.02em] text-gray-900 ${
          compact ? 'text-base' : 'text-xl'
        }`}
      >
        Motos y Carros
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="h-px w-5 bg-brand" />
        <span
          className={`font-bold uppercase tracking-[0.22em] text-brand ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          La 14
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// HERO
// ------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div className="pointer-events-none absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-brand-soft opacity-70" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 md:py-20">
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            Alquiler de motos y carros · La Dorada
          </div>
          <h1
            className="mt-3 text-4xl font-black leading-tight tracking-tight text-gray-900 md:text-5xl"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            LA DORADA SOBRE
            <br />
            <span className="text-brand">RUEDAS DESDE {BUSINESS_INFO.since}</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-gray-600">
            Flota de motos y carros lista para tu día a día, viajes o trabajo.
            Reserva en minutos con documentos en regla y acompañamiento local.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#catalogo"
              className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-[#C8152A]"
            >
              Ver vehículos disponibles
            </a>
            <a
              href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:border-gray-300"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              WhatsApp
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-gray-200 pt-6 text-left">
            <HeroStat num={String(new Date().getFullYear() - BUSINESS_INFO.since)} label="Años en La Dorada" />
            <HeroStat num="100%" label="Documentos al día" />
            <HeroStat num="24/7" label="Atención WhatsApp" />
          </dl>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
            <div
              className="absolute -top-4 -right-4 rounded-md bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              LA 14
            </div>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-50">
              <svg viewBox="0 0 200 140" className="h-full w-full">
                <rect width="200" height="140" fill="#F9FAFB" />
                <path
                  d="M40 110h80M50 110a15 15 0 1 1-30 0 15 15 0 0 1 30 0Zm130 0a15 15 0 1 1-30 0 15 15 0 0 1 30 0Z"
                  fill="none"
                  stroke="#E8192C"
                  strokeWidth="5"
                />
                <path
                  d="M55 105l25-40h35l25 40M95 65v-8h18v8"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="4"
                />
              </svg>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <HeroPill label="Motos" />
              <HeroPill label="Carros" />
              <HeroPill label="Camionetas" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroStat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <dt
        className="text-2xl font-black text-gray-900"
        style={{ fontFamily: 'var(--font-brand)' }}
      >
        {num}
      </dt>
      <dd className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </dd>
    </div>
  )
}

function HeroPill({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white py-2 text-xs font-semibold uppercase tracking-wider text-gray-700">
      {label}
    </div>
  )
}

// ------------------------------------------------------------------
// CATÁLOGO
// ------------------------------------------------------------------
function Catalog({
  vehicles,
  loading,
  filter,
  onFilter,
}: {
  vehicles: Vehicle[]
  loading: boolean
  filter: VehicleType | 'all'
  onFilter: (f: VehicleType | 'all') => void
}) {
  return (
    <section id="catalogo" className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <SectionLabel>Catálogo</SectionLabel>
        <h2
          className="mt-2 text-3xl font-black tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          VEHÍCULOS DISPONIBLES
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Disponibilidad actualizada en tiempo real.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`rounded-md border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                filter === f.value
                  ? 'border-brand bg-brand text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
              />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-white px-6 py-16 text-center text-gray-500">
            No hay vehículos en esta categoría por el momento.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const available = vehicle.status === 'disponible'
  const photo = vehiclePhoto(vehicle.photos, vehicle.vehicle_type)

  return (
    <Link
      to={`/publico/vehiculo/${vehicle.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={photo}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="h-full w-full object-cover transition group-hover:scale-105"
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
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700">
          {vehicle.vehicle_type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          {vehicle.brand}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{vehicle.model}</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          {vehicle.year ?? '—'}
          {vehicle.engine_cc ? ` · ${vehicle.engine_cc} cc` : ''}
          {vehicle.color ? ` · ${vehicle.color}` : ''}
        </p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Desde
            </div>
            <div className="text-xl font-black text-brand">
              {COP.format(Number(vehicle.daily_rate))}
              <span className="text-xs font-medium text-gray-500"> /día</span>
            </div>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand group-hover:underline">
            Ver detalle →
          </span>
        </div>
      </div>
    </Link>
  )
}

// ------------------------------------------------------------------
// CÓMO FUNCIONA
// ------------------------------------------------------------------
function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: 'Elige tu vehículo',
      desc: 'Explora el catálogo y selecciona el que mejor se acomode a tu necesidad.',
    },
    {
      n: 2,
      title: 'Envía la solicitud',
      desc: 'Llena el formulario con tus datos y las fechas deseadas.',
    },
    {
      n: 3,
      title: 'Recibe confirmación',
      desc: 'Te escribimos por WhatsApp para confirmar disponibilidad y pago.',
    },
    {
      n: 4,
      title: 'Recoge el vehículo',
      desc: 'Firma el contrato en el punto, entrega documentos y listo.',
    },
  ]

  return (
    <section id="como-funciona" className="border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <SectionLabel>Cómo funciona</SectionLabel>
        <h2
          className="mt-2 text-3xl font-black tracking-tight text-gray-900"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          4 PASOS Y LISTO
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-xl border border-gray-200 bg-white p-5"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-black text-white"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// REQUISITOS
// ------------------------------------------------------------------
function Requirements() {
  const items = [
    'Cédula de ciudadanía o extranjería vigente',
    'Licencia de conducción acorde al tipo de vehículo',
    'Comprobante de residencia reciente (menos de 3 meses)',
    'Depósito de garantía (reembolsable al devolver el vehículo)',
    'Edad mínima 21 años',
    'Firma del contrato de alquiler en el punto',
  ]

  return (
    <section id="requisitos" className="border-b border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 md:grid-cols-2 md:py-20">
        <div>
          <SectionLabel>Requisitos</SectionLabel>
          <h2
            className="mt-2 text-3xl font-black tracking-tight text-gray-900"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            DOCUMENTOS NECESARIOS
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Para garantizar tu tranquilidad y la nuestra pedimos estos
            documentos. Si tienes dudas escríbenos por WhatsApp y te
            orientamos.
          </p>
          <a
            href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
              'Hola, tengo una consulta sobre los requisitos para alquilar.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-gray-300"
          >
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            Consultar por WhatsApp
          </a>
        </div>

        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it}
              className="flex items-start gap-3 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                ✓
              </span>
              {it}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// UBICACIÓN
// ------------------------------------------------------------------
function Location() {
  return (
    <section id="ubicacion" className="border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-14 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div>
          <SectionLabel>Ubicación</SectionLabel>
          <h2
            className="mt-2 text-3xl font-black tracking-tight text-gray-900"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            NOS ENCUENTRAS EN LA DORADA
          </h2>
          <p className="mt-3 text-sm text-gray-600">{BUSINESS_INFO.address}</p>
          <div className="mt-5 space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                WhatsApp:
              </span>
              <a
                href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline"
              >
                {BUSINESS_INFO.whatsappDisplay}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Atención:
              </span>
              <span>Lunes a sábado · 7:00 am – 7:00 pm</span>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps?q=${BUSINESS_INFO.mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C8152A]"
          >
            Abrir en Google Maps
          </a>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <iframe
            title="Ubicación en Google Maps"
            src={`https://maps.google.com/maps?q=${BUSINESS_INFO.mapsQuery}&hl=es&z=13&output=embed`}
            loading="lazy"
            className="h-80 w-full"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// FOOTER
// ------------------------------------------------------------------
function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            Alquiler de
          </div>
          <div
            className="text-xl font-black uppercase tracking-[0.02em] text-white"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            Motos y Carros
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="h-px w-6 bg-brand" />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              La 14
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-gray-400">
            {BUSINESS_INFO.tagline}. Flota mantenida al día y atención
            personalizada.
          </p>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Contacto
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>{BUSINESS_INFO.address}</li>
            <li>
              <a
                href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
                className="hover:text-white"
              >
                {BUSINESS_INFO.whatsappDisplay}
              </a>
            </li>
            <li>
              <a
                href={BUSINESS_INFO.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Instagram
              </a>{' '}
              ·{' '}
              <a
                href={BUSINESS_INFO.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Facebook
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Métodos de pago
          </div>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {BUSINESS_INFO.paymentMethods.map((m) => (
              <li
                key={m}
                className="rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 font-medium text-gray-200"
              >
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-6 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            Admin
          </div>
          <Link
            to="/login"
            className="mt-2 inline-block text-sm text-gray-400 hover:text-white"
          >
            Acceso al panel →
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-800 bg-black/40 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {BUSINESS_INFO.name}. Todos los derechos
        reservados.
      </div>
    </footer>
  )
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      {children}
    </div>
  )
}

function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.44 0 .08 5.36.08 11.96c0 2.11.55 4.17 1.6 5.98L0 24l6.23-1.63a11.96 11.96 0 0 0 5.81 1.48h.01c6.6 0 11.96-5.36 11.96-11.96 0-3.2-1.25-6.2-3.49-8.41Zm-8.48 18.4h-.01a9.93 9.93 0 0 1-5.06-1.39l-.36-.22-3.7.97.99-3.6-.24-.37a9.92 9.92 0 0 1-1.52-5.3c0-5.48 4.46-9.94 9.94-9.94 2.66 0 5.16 1.03 7.03 2.91a9.86 9.86 0 0 1 2.91 7.04c0 5.48-4.46 9.94-9.98 9.94Zm5.46-7.44c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.51-.07-.15-.68-1.64-.94-2.25-.25-.59-.5-.51-.68-.52h-.58c-.2 0-.51.07-.78.37-.27.3-1.03 1-1.03 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.67.61.7.22 1.34.19 1.84.11.56-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.34Z" />
    </svg>
  )
}
