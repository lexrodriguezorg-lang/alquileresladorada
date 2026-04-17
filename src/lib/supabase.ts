import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. ' +
      'Revisa el archivo .env y asegúrate de definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

// Cliente sin tipado de Database (Database type generation pendiente).
// Las consultas son `any`-tipadas; se valida con Zod en formularios.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase
