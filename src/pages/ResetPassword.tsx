import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import BrandMark from '../components/BrandMark'

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

type Values = z.infer<typeof schema>

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const [verifying, setVerifying] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  // Cuando se llega desde el email de recovery, supabase-js detecta el token
  // del hash de la URL y crea una sesión temporal automáticamente.
  useEffect(() => {
    let cancelled = false

    // Si ya hay sesión válida (recovery), permitir el cambio de contraseña.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setHasSession(!!data.session)
      setVerifying(false)
    })

    // También escucha el evento PASSWORD_RECOVERY explícito
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY' || sess) {
        setHasSession(true)
        setVerifying(false)
      }
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (v: Values) => {
    setServerError(null)
    try {
      await updatePassword(v.password)
      setDone(true)
      // Cierra esta sesión de recovery; obliga a iniciar sesión con la nueva contraseña.
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Error desconocido')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_40px_rgba(17,24,39,0.06)]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size="lg" variant="stacked" />
          <p className="mt-4 text-sm text-gray-500">
            Crea tu nueva contraseña
          </p>
        </div>

        {verifying ? (
          <div className="text-center text-sm text-gray-500">
            Verificando enlace…
          </div>
        ) : !hasSession ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-3 text-sm text-brand">
              El enlace no es válido o ya expiró. Solicita uno nuevo desde
              "¿Olvidaste tu contraseña?".
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A]"
            >
              Volver al login
            </button>
          </div>
        ) : done ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-white">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Contraseña actualizada
            </h3>
            <p className="text-sm text-gray-600">
              Te llevamos al login para que entres con tu nueva contraseña…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nueva contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-brand">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirma la contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirm')}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              {errors.confirm && (
                <p className="mt-1 text-xs text-brand">
                  {errors.confirm.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-[#C8152A] disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
