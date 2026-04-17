import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePendingBookings } from '../hooks/usePendingBookings'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/solicitudes', label: 'Solicitudes', badgeKey: 'pending' as const },
  { to: '/vehiculos', label: 'Vehículos' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/contratos', label: 'Contratos' },
  { to: '/recibos', label: 'Recibos' },
]

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
        <BrandLogo />

        <nav className="flex-1 space-y-0.5 px-3 py-5">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Menú
          </div>
          {navItems.map((item) => {
            const badge =
              item.badgeKey === 'pending' && pending > 0 ? pending : null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
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
                    <span>{item.label}</span>
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
          <p className="mt-3 text-[11px] text-gray-400">v0.1.0</p>
        </div>
      </aside>

      {/* ---------- Mobile header ---------- */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-brand px-4 py-3 md:hidden">
        <div className="leading-tight">
          <div
            className="text-xs font-extrabold uppercase tracking-[0.06em] text-white"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            Alquiler de motos y carros
          </div>
          <div
            className="text-lg font-black uppercase tracking-[0.1em] text-white"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            La 14
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
        >
          Salir
        </button>
      </header>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white md:hidden">
        {navItems.slice(0, 5).map((item) => {
          const badge =
            item.badgeKey === 'pending' && pending > 0 ? pending : null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-1 items-center justify-center py-3 text-[11px] font-semibold uppercase tracking-wider ${
                  isActive ? 'text-brand' : 'text-gray-500'
                }`
              }
            >
              {item.label}
              {badge && (
                <span className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                  {badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ---------- Main ---------- */}
      <main className="min-h-screen bg-white md:pl-64 pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}

// ------------------------------------------------------------------
function BrandLogo() {
  return (
    <div
      className="relative bg-brand px-6 py-6"
      style={{ fontFamily: 'var(--font-brand)' }}
    >
      <div className="absolute right-4 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border-2 border-white/25">
        <div className="flex h-full items-center justify-center text-[11px] font-black uppercase tracking-tighter text-white">
          LA 14
        </div>
      </div>

      <div className="pr-16 leading-[1.05]">
        <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/90">
          Alquiler de
        </div>
        <div className="text-[22px] font-black uppercase tracking-[0.02em] text-white">
          Motos y Carros
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-px w-6 bg-white/60" />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
            La Dorada
          </span>
        </div>
      </div>
    </div>
  )
}
