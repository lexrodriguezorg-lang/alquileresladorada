import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  children: ReactNode
  span?: 'full' | 'half'
}

export default function FormField({
  label,
  error,
  hint,
  children,
  span = 'full',
}: FormFieldProps) {
  return (
    <div className={span === 'full' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
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

export const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export const btnPrimary =
  'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A] disabled:opacity-60'

export const btnSecondary =
  'rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50'
