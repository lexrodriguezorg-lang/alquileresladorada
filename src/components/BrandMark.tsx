// ------------------------------------------------------------------
// Brand mark — logo oficial "Alquileres La 14"
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

const sizeMap: Record<Size, { badge: string; text1: string; text2: string; text3: string; gap: string }> = {
  sm: { badge: 'h-8 w-8', text1: 'text-[9px]', text2: 'text-sm', text3: 'text-[8px]', gap: 'gap-2' },
  md: { badge: 'h-10 w-10', text1: 'text-[10px]', text2: 'text-base', text3: 'text-[9px]', gap: 'gap-2.5' },
  lg: { badge: 'h-14 w-14', text1: 'text-xs', text2: 'text-xl', text3: 'text-[10px]', gap: 'gap-3' },
  xl: { badge: 'h-20 w-20', text1: 'text-sm', text2: 'text-3xl', text3: 'text-[11px]', gap: 'gap-4' },
}

const numSize: Record<Size, string> = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
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

  // ----- Badge (sello rojo con "14") -----
  const Badge = (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-lg bg-brand shadow-[0_4px_14px_rgba(232,25,44,0.35)] ${s.badge}`}
      style={{ fontFamily: 'var(--font-brand)' }}
      aria-hidden
    >
      {/* Esquinas decorativas */}
      <span className="absolute left-1 top-1 h-1 w-1 rounded-full bg-white/40" />
      <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-white/40" />
      <span
        className={`font-black leading-none tracking-tight text-white ${numSize[size]}`}
      >
        14
      </span>
    </div>
  )

  if (variant === 'icon') {
    return <span className={`inline-flex ${className}`}>{Badge}</span>
  }

  // ----- Wordmark -----
  const Wordmark = (
    <div
      className="leading-[1.05]"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      <div
        className={`font-bold uppercase tracking-[0.18em] ${fgMuted} ${s.text1}`}
      >
        Alquileres
      </div>
      <div
        className={`font-black uppercase tracking-[0.02em] ${fg} ${s.text2}`}
      >
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
