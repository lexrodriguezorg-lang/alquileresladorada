import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BrandMark from '../components/BrandMark'

type Mode = 'signin' | 'signup' | 'forgot'

// Schema único: password opcional. Validamos longitud según modo en runtime.
const authSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().optional(),
})
type AuthValues = z.infer<typeof authSchema>

export default function Login() {
  const { session, signIn, signUp, resetPassword } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('signin')
  const [serverError, setServerError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
  })

  if (session) {
    const redirect =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? '/'
    return <Navigate to={redirect} replace />
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setServerError(null)
    setInfo(null)
    reset()
  }

  const onSubmit = async (values: AuthValues) => {
    setServerError(null)
    setInfo(null)
    try {
      if (mode === 'forgot') {
        await resetPassword(values.email)
        setInfo(
          'Te enviamos un correo con un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.'
        )
        return
      }
      const password = values.password ?? ''
      if (password.length < 6) {
        setServerError('La contraseña debe tener mínimo 6 caracteres')
        return
      }
      if (mode === 'signin') {
        await signIn(values.email, password)
      } else {
        await signUp(values.email, password)
        setInfo(
          'Cuenta creada. Revisa tu correo si se requiere verificación, o inicia sesión.'
        )
        switchMode('signin')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setServerError(msg)
    }
  }

  const headings: Record<Mode, { sub: string; cta: string }> = {
    signin: { sub: 'Inicia sesión para continuar', cta: 'Iniciar sesión' },
    signup: { sub: 'Crea una cuenta de acceso', cta: 'Crear cuenta' },
    forgot: {
      sub: 'Te enviamos un enlace para restablecer tu contraseña',
      cta: 'Enviar enlace',
    },
  }
  const h = headings[mode]

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_40px_rgba(17,24,39,0.06)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" variant="stacked" />
          <p className="mt-4 text-sm text-gray-500">{h.sub}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Correo
            </label>
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

          {mode !== 'forgot' && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <input
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                {...register('password')}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-brand">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}

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
            {isSubmitting ? 'Procesando…' : h.cta}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {mode === 'signin' && (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-medium text-brand hover:underline"
              >
                Regístrate
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-medium text-brand hover:underline"
              >
                Inicia sesión
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="font-medium text-brand hover:underline"
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
