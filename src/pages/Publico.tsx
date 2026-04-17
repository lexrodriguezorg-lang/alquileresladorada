import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vehicle, VehicleType } from '../lib/database.types'
import { vehiclePhoto } from '../lib/vehiclePhoto'
import { BUSINESS_INFO } from '../lib/business'
import BrandMark from '../components/BrandMark'

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
      <Hero vehicles={vehicles} loading={loading} />
      <Stats />
      <Catalog
        vehicles={filtered}
        loading={loading}
        filter={filter}
        onFilter={setFilter}
      />
      <HowItWorks />
      <Testimonials />
      <Requirements />
      <Location />
      <PublicFooter />
      <MobileStickyCTA />
    </div>
  )
}

// ------------------------------------------------------------------
// NAV
// ------------------------------------------------------------------
function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <BrandMark size="sm" />
        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
          <a href="#catalogo" className="hover:text-gray-900">Catálogo</a>
          <a href="#como-funciona" className="hover:text-gray-900">Cómo funciona</a>
          <a href="#opiniones" className="hover:text-gray-900">Opiniones</a>
          <a href="#ubicacion" className="hover:text-gray-900">Ubicación</a>
        </nav>
        <a
          href={`https://wa.me/${BUSINESS_INFO.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#C8152A]"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>
    </header>
  )
}

// ------------------------------------------------------------------
// HERO (photo-forward, con fotos reales de la flota)
// ------------------------------------------------------------------
function Hero({ vehicles, loading }: { vehicles: Vehicle[]; loading: boolean }) {
  // Usa las primeras 4 fotos de la flota para el mosaico
  const heroVehicles = vehicles.slice(0, 4)
  while (heroVehicles.length < 4) heroVehicles.push(null as unknown as Vehicle)

  const age = new Date().getFullYear() - BUSINESS_INFO.since

  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      {/* Blob rojo decorativo */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand/5" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[300px] w-[300px] rounded-full bg-brand-soft opacity-60" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-12 md:grid-cols-[1.05fr_1fr] md:py-20 lg:gap-16">
        {/* -------- Texto -------- */}
        <div className="flex flex-col justify-center">
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            {age} años en La Dorada
          </div>

          <h1
            className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-gray-900 md:text-6xl"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            LA DORADA SOBRE
            <br />
            <span className="text-brand">RUEDAS</span>{' '}
            <span className="text-gray-900">DESDE {BUSINESS_INFO.since}</span>
          </h1>

          <p className="mt-5 max-w-lg text-base text-gray-600 md:text-lg">
            Flota propia de motos y carros lista para tu día a día, viajes o
            trabajo. <strong className="font-semibold text-gray-800">Reserva en minutos por WhatsApp</strong>, atención personal y documentos en regla.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#catalogo"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-brand/20 hover:bg-[#C8152A]"
            >
              Ver catálogo
              <span>→</span>
            </a>
            <a
              href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent('Hola, quiero alquilar una moto/carro.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-gray-800 hover:border-[#25D366] hover:text-[#128C4A]"
            >
              <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
              WhatsApp
            </a>
          </div>

          <div className="mt-8 flex items-center gap-4 border-t border-gray-200 pt-5 text-xs text-gray-500">
            <Check /> Documentos al día
            <Check /> SOAT y RTM vigentes
            <Check /> Pagos seguros
          </div>
        </div>

        {/* -------- Mosaico de fotos reales -------- */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            {heroVehicles.map((v, i) => (
              <HeroTile key={i} vehicle={v} loading={loading} index={i} />
            ))}
          </div>
          {/* Tarjeta flotante de precio destacado */}
          {vehicles[0] && (
            <div className="absolute -bottom-6 left-1/2 w-64 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
              <div
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                Desde
              </div>
              <div
                className="mt-0.5 text-3xl font-black text-gray-900"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {COP.format(Number(vehicles[0].daily_rate))}
                <span className="ml-1 text-sm font-medium text-gray-500">/día</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Incluye casco · depósito reembolsable
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function HeroTile({
  vehicle,
  loading,
  index,
}: {
  vehicle: Vehicle | null
  loading: boolean
  index: number
}) {
  const sizeCls =
    index === 0 || index === 3 ? 'aspect-[4/5]' : 'aspect-[4/3]'
  if (loading || !vehicle) {
    return (
      <div className={`${sizeCls} animate-pulse rounded-xl bg-gray-100`} />
    )
  }
  const photo = vehiclePhoto(vehicle.photos, vehicle.vehicle_type)
  return (
    <Link
      to={`/publico/vehiculo/${vehicle.id}`}
      className={`${sizeCls} group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50`}
    >
      <img
        src={photo}
        alt={`${vehicle.brand} ${vehicle.model}`}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">
          {vehicle.brand}
        </div>
        <div className="text-sm font-semibold">{vehicle.model}</div>
      </div>
    </Link>
  )
}

function Check() {
  return (
    <span className="inline-flex items-center gap-1">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-emerald-500" fill="currentColor">
        <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0Z" />
      </svg>
    </span>
  )
}

// ------------------------------------------------------------------
// STATS (tira de confianza)
// ------------------------------------------------------------------
function Stats() {
  const age = new Date().getFullYear() - BUSINESS_INFO.since
  const items = [
    { num: `${age}+`, label: 'Años operando' },
    { num: '500+', label: 'Clientes atendidos' },
    { num: '24/7', label: 'Atención WhatsApp' },
    { num: '100%', label: 'Documentos al día' },
  ]
  return (
    <section className="border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 px-5 py-8 md:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={s.label}
            className={`text-center ${i < items.length - 1 ? 'md:border-r md:border-gray-200' : ''}`}
          >
            <div
              className="text-3xl font-black text-gray-900"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {s.num}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <SectionLabel>Catálogo</SectionLabel>
        <div className="mt-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <h2
            className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            VEHÍCULOS DISPONIBLES
          </h2>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Disponibilidad en tiempo real
          </span>
        </div>

        <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
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
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center text-gray-500">
            No hay vehículos en esta categoría por el momento.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={photo}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              available ? 'bg-emerald-500 text-white' : 'bg-gray-800/90 text-white'
            }`}
          >
            {available ? '● Disponible' : 'Ocupado'}
          </span>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-700 shadow-sm">
          {vehicle.vehicle_type}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          {vehicle.brand}
        </div>
        <h3
          className="mt-0.5 text-xl font-black text-gray-900"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          {vehicle.model}
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
          {vehicle.year && <span>{vehicle.year}</span>}
          {vehicle.engine_cc && <span>· {vehicle.engine_cc} cc</span>}
          {vehicle.color && <span>· {vehicle.color}</span>}
        </p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Desde
            </div>
            <div
              className="text-2xl font-black text-brand"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {COP.format(Number(vehicle.daily_rate))}
              <span className="text-xs font-medium text-gray-500"> /día</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white group-hover:bg-brand">
            Ver →
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
    { n: '01', title: 'Elige tu vehículo', desc: 'Explora el catálogo y selecciona el que se acomode a tu necesidad.' },
    { n: '02', title: 'Envía tu solicitud', desc: 'Llena el formulario con tus datos y las fechas deseadas.' },
    { n: '03', title: 'Recibe confirmación', desc: 'Te escribimos por WhatsApp para confirmar disponibilidad y pago.' },
    { n: '04', title: 'Recoge el vehículo', desc: 'Firma el contrato, entrega documentos, y sal rodando.' },
  ]

  return (
    <section id="como-funciona" className="border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <SectionLabel>Cómo funciona</SectionLabel>
        <h2
          className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          4 PASOS Y LISTO
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="text-5xl font-black text-brand/20"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {s.n}
              </div>
              <h3
                className="mt-1 text-base font-bold text-gray-900"
                style={{ fontFamily: 'var(--font-brand)' }}
              >
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
              {i < steps.length - 1 && (
                <span className="absolute right-4 top-4 hidden text-gray-300 lg:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------
// TESTIMONIOS
// ------------------------------------------------------------------
function Testimonials() {
  const reviews = [
    {
      name: 'Juan Pablo',
      text: 'Alquilé una moto por 3 semanas para trabajo. Mantenimiento impecable y atención siempre atenta por WhatsApp.',
      role: 'Domiciliario · La Dorada',
    },
    {
      name: 'María Fernanda',
      text: 'Me prestaron la Yamaha FZ para un viaje de fin de semana. Todo en orden, sin sorpresas, precio justo.',
      role: 'Viajera · Manizales',
    },
    {
      name: 'Carlos Andrés',
      text: 'La 14 es mi opción de confianza hace 2 años. David siempre responde rápido y cumple lo que promete.',
      role: 'Cliente frecuente',
    },
  ]
  return (
    <section id="opiniones" className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <SectionLabel>Opiniones</SectionLabel>
        <h2
          className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          LO QUE DICEN NUESTROS CLIENTES
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <article
              key={r.name}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <div className="flex text-amber-400">
                {'★★★★★'.split('').map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-700">
                &ldquo;{r.text}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-black text-white"
                  style={{ fontFamily: 'var(--font-brand)' }}
                >
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                  <div className="text-[11px] text-gray-500">{r.role}</div>
                </div>
              </div>
            </article>
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
    <section id="requisitos" className="border-b border-gray-200 bg-[#F9FAFB]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
        <div>
          <SectionLabel>Requisitos</SectionLabel>
          <h2
            className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            DOCUMENTOS NECESARIOS
          </h2>
          <p className="mt-3 text-sm text-gray-600">
            Para garantizar tu tranquilidad y la nuestra pedimos estos
            documentos. Si tienes dudas, escríbenos por WhatsApp y te
            orientamos.
          </p>
          <a
            href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
              'Hola, tengo una consulta sobre los requisitos para alquilar.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:border-[#25D366] hover:text-[#128C4A]"
          >
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            Consultar por WhatsApp
          </a>
        </div>

        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it}
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
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
    <section id="ubicacion" className="border-b border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-14 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div>
          <SectionLabel>Ubicación</SectionLabel>
          <h2
            className="mt-2 text-3xl font-black tracking-tight text-gray-900 md:text-4xl"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            NOS ENCUENTRAS EN LA DORADA
          </h2>
          <p className="mt-3 text-sm text-gray-600">{BUSINESS_INFO.address}</p>
          <div className="mt-5 space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">WhatsApp:</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Atención:</span>
              <span>Lunes a sábado · 7:00 am – 7:00 pm</span>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps?q=${BUSINESS_INFO.mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#C8152A]"
          >
            Abrir en Google Maps →
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
    <footer className="bg-gray-950 text-gray-300">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-5 py-12 md:grid-cols-3">
        <div>
          <BrandMark size="md" inverse />
          <p className="mt-4 max-w-xs text-sm text-gray-400">
            {BUSINESS_INFO.tagline}. Flota mantenida al día y atención
            personalizada.
          </p>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
            Contacto
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>{BUSINESS_INFO.address}</li>
            <li>
              <a href={`https://wa.me/${BUSINESS_INFO.whatsapp}`} className="hover:text-white">
                {BUSINESS_INFO.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={BUSINESS_INFO.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Instagram
              </a>{' '}
              ·{' '}
              <a href={BUSINESS_INFO.social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Facebook
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
            Métodos de pago
          </div>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {BUSINESS_INFO.paymentMethods.map((m) => (
              <li
                key={m}
                className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 font-medium text-gray-200"
              >
                {m}
              </li>
            ))}
          </ul>
          <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
            Admin
          </div>
          <Link to="/login" className="mt-2 inline-block text-sm text-gray-400 hover:text-white">
            Acceso al panel →
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-800 bg-black/50 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {BUSINESS_INFO.name}. Todos los derechos reservados.
      </div>
    </footer>
  )
}

// ------------------------------------------------------------------
// MOBILE STICKY CTA (aparece solo en móvil)
// ------------------------------------------------------------------
function MobileStickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-md md:hidden">
      <div className="flex gap-2">
        <a
          href="#catalogo"
          className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-3 text-center text-sm font-bold uppercase tracking-wider text-gray-900"
        >
          Catálogo
        </a>
        <a
          href={`https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent('Hola, quiero alquilar.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-[#25D366]/30"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </a>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-brand"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      <span className="h-px w-6 bg-brand" />
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
