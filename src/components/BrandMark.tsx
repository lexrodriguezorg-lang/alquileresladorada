// ------------------------------------------------------------------
// Brand mark — logo oficial "Alquileres La 14"
// Sello rojo con silueta de moto + wordmark La Dorada · Motos · Carros
// ------------------------------------------------------------------

type Variant = 'horizontal' | 'stacked' | 'icon'
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface BrandMarkProps {
  variant?: Variant
  size?: Size
  /** Si true: texto en blanco (para fondos oscuros/rojos) */
  inverse?: boolean
  className?: string
}

const sizeMap: Record<
  Size,
  { badge: string; text1: string; text2: string; text3: string; gap: string }
> = {
  sm: { badge: 'h-9 w-9', text1: 'text-[9px]', text2: 'text-sm', text3: 'text-[8px]', gap: 'gap-2' },
  md: { badge: 'h-11 w-11', text1: 'text-[10px]', text2: 'text-base', text3: 'text-[9px]', gap: 'gap-2.5' },
  lg: { badge: 'h-14 w-14', text1: 'text-xs', text2: 'text-xl', text3: 'text-[10px]', gap: 'gap-3' },
  xl: { badge: 'h-20 w-20', text1: 'text-sm', text2: 'text-3xl', text3: 'text-[11px]', gap: 'gap-4' },
}

export default function BrandMark({
  variant = 'horizontal',
  size = 'md',
  inverse = false,
  className = '',
}: BrandMarkProps) {
  const s = sizeMap[size]
  const fg = inverse ? 'text-white' : 'text-gray-900'
  const fgMuted = inverse ? 'text-white/70' : 'text-gray-500'

  // ----- Badge (sello rojo con silueta de moto) -----
  const Badge = (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand shadow-[0_4px_14px_rgba(232,25,44,0.35)] ${s.badge}`}
      aria-hidden
    >
      <MotoSilhouette className="h-full w-full" />
    </div>
  )

  if (variant === 'icon') {
    return <span className={`inline-flex ${className}`}>{Badge}</span>
  }

  // ----- Wordmark -----
  const Wordmark = (
    <div className="leading-[1.05]" style={{ fontFamily: 'var(--font-brand)' }}>
      <div className={`font-bold uppercase tracking-[0.18em] ${fgMuted} ${s.text1}`}>
        Alquileres
      </div>
      <div className={`font-black uppercase tracking-[0.02em] ${fg} ${s.text2}`}>
        La Dorada
      </div>
      <div
        className={`mt-0.5 flex items-center gap-1.5 font-semibold uppercase ${s.text3}`}
      >
        <span className={inverse ? 'h-px w-3 bg-white/60' : 'h-px w-3 bg-brand'} />
        <span className={`tracking-[0.24em] ${inverse ? 'text-white/80' : 'text-brand'}`}>
          Motos · Carros
        </span>
      </div>
    </div>
  )

  return (
    <div
      className={`inline-flex items-center ${s.gap} ${
        variant === 'stacked' ? 'flex-col items-start' : ''
      } ${className}`}
    >
      {Badge}
      {Wordmark}
    </div>
  )
}

// ------------------------------------------------------------------
// Silueta de moto (mismo diseño que el favicon)
// ------------------------------------------------------------------
function MotoSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      {/* Dots decorativos opcionales (muy sutiles) */}
      <circle cx="9" cy="9" r="1.6" fill="rgba(255,255,255,0.35)" />
      <circle cx="55" cy="55" r="1.6" fill="rgba(255,255,255,0.35)" />
      <g
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ruedas */}
        <circle cx="18" cy="44" r="8" />
        <circle cx="46" cy="44" r="8" />
        {/* Cuadro/cuerpo */}
        <path d="M18 44 L25 32 L41 30 L46 44 M25 32 L42 32" />
        {/* Horquilla y manubrio */}
        <path d="M46 44 L50 22 M44 22 L54 22" />
      </g>
    </svg>
  )
}
