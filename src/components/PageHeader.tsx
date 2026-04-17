import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
          Alquileres La 14
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
