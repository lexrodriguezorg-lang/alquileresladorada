import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [serverError, setServerError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (session) {
    const redirect =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? '/'
    return <Navigate to={redirect} replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setServerError(null)
    setInfo(null)
    try {
      if (mode === 'signin') {
        await signIn(values.email, values.password)
      } else {
        await signUp(values.email, values.password)
        setInfo('Cuenta creada. Revisa tu correo si se requiere verificación, o inicia sesión.')
        setMode('signin')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setServerError(msg)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_40px_rgba(17,24,39,0.06)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-lg bg-brand px-3 py-2 text-lg font-bold tracking-tight text-white">
            Alquileres La Dorada
          </div>
          <p className="text-sm text-gray-500">
            {mode === 'signin' ? 'Inicia sesión para continuar' : 'Crea una cuenta de acceso'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-brand">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              {...register('password')}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-brand">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand">
              {serverError}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A] disabled:opacity-60"
          >
            {isSubmitting
              ? 'Procesando…'
              : mode === 'signin'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {mode === 'signin' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-brand hover:underline"
              >
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-medium text-brand hover:underline"
              >
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
