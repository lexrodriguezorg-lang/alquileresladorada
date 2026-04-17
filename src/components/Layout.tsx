import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePendingBookings } from '../hooks/usePendingBookings'
import BrandMark from './BrandMark'

type NavItem = {
  to: string
  label: string
  shortLabel: string
  icon: React.FC<{ className?: string }>
  badgeKey?: 'pending'
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', shortLabel: 'Inicio', icon: IconDashboard },
  { to: '/solicitudes', label: 'Solicitudes', shortLabel: 'Solicitudes', icon: IconInbox, badgeKey: 'pending' },
  { to: '/vehiculos', label: 'Vehículos', shortLabel: 'Flota', icon: IconMotorcycle },
  { to: '/clientes', label: 'Clientes', shortLabel: 'Clientes', icon: IconUsers },
  { to: '/contratos', label: 'Contratos', shortLabel: 'Contratos', icon: IconDocument },
  { to: '/recibos', label: 'Recibos', shortLabel: 'Recibos', icon: IconReceipt },
]

// Items visibles en bottom nav móvil (limitado a 5 para no saturar)
const mobileNavItems = navItems.slice(0, 5)

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const pending = usePendingBookings()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-200 bg-white shadow-[0_0_24px_rgba(17,24,39,0.04)] md:flex">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-5">
          <BrandMark size="md" />
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-5">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Menú
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const badge =
              item.badgeKey === 'pending' && pending > 0 ? pending : null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gray-50 text-brand'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" />
                    )}
                    <span className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
                      {item.label}
                    </span>
                    {badge && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 px-4 py-4">
          <div className="mb-2 truncate text-xs text-gray-500">
            {user?.email ?? 'Invitado'}
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand hover:text-brand"
          >
            Cerrar sesión
          </button>
          <p className="mt-3 text-[11px] text-gray-400">v0.2 · Alquileres La 14</p>
        </div>
      </aside>

      {/* ---------- Mobile header ---------- */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <BrandMark size="sm" />
        <button
          onClick={handleLogout}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-brand hover:text-brand"
        >
          Salir
        </button>
      </header>

      {/* ---------- Mobile bottom nav (estilo app) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white pb-safe md:hidden">
        <div className="flex">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const badge =
              item.badgeKey === 'pending' && pending > 0 ? pending : null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wider ${
                    isActive ? 'text-brand' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-brand' : 'text-gray-400'}`} />
                    <span>{item.shortLabel}</span>
                    {isActive && (
                      <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-brand" />
                    )}
                    {badge && (
                      <span className="absolute top-1.5 right-1/4 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ---------- Main ---------- */}
      <main className="min-h-screen bg-white md:pl-64 pb-[72px] md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}

// ------------------------------------------------------------------
// Icons (SVG inline, heroicons-like)
// ------------------------------------------------------------------
function IconBase({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.8}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}
function IconDashboard({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </IconBase>
  )
}
function IconInbox({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" />
      <path d="M3 12h5l2 3h4l2-3h5" />
      <path d="M7 6h10l2 6" />
      <path d="M5 12 7 6" />
    </IconBase>
  )
}
function IconMotorcycle({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M5 16h5l4-6h4l2 6" />
      <path d="M13 7h4" />
    </IconBase>
  )
}
function IconUsers({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M14.5 14c2 .3 4 1.6 4.5 4" />
    </IconBase>
  )
}
function IconDocument({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </IconBase>
  )
}
function IconReceipt({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </IconBase>
  )
}
