# Alquileres La Dorada · Alquiler de Motos y Carros La 14

Sistema web para la gestión integral del negocio de alquiler de motos y carros
en La Dorada, Caldas. Incluye landing pública con catálogo y solicitud de
reservas, y un panel administrativo completo (vehículos, clientes, contratos,
recibos, factura PDF).

## Stack

- **React 19** + **TypeScript** + **Vite**
- **TailwindCSS v4** (tema custom)
- **React Router v7**
- **React Hook Form** + **Zod**
- **Supabase** (Postgres + Auth + RLS)
- **@react-pdf/renderer** (factura PDF)

## Estructura

```
src/
├── components/      Componentes UI reutilizables (Modal, Layout, formularios…)
├── hooks/           useAuth, usePendingBookings…
├── lib/             supabase client, tipos, schemas Zod, constantes negocio
└── pages/
    ├── Publico.tsx          /publico        (landing pública, sin auth)
    ├── PublicoVehiculo.tsx  /publico/vehiculo/:id
    ├── Login.tsx            /login
    ├── Dashboard.tsx        /
    ├── Solicitudes.tsx      /solicitudes
    ├── Vehiculos.tsx        /vehiculos
    ├── Clientes.tsx         /clientes
    ├── Contratos.tsx        /contratos
    └── Recibos.tsx          /recibos        (genera factura PDF)

supabase/
├── migrations/
│   ├── 0001_init_schema.sql      Tablas y RLS base
│   └── 0002_public_access.sql    RPC pública para reservas
└── seed.sql                      Datos de ejemplo
```

## Variables de entorno

Crea un archivo `.env` (no commitear) con:

```bash
VITE_SUPABASE_URL=https://<tu-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

En Vercel, configura las mismas variables en
**Project → Settings → Environment Variables**.

## Scripts

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo (puerto 5173)
npm run build      # build de producción → dist/
npm run preview    # previsualizar build
npm run lint       # ESLint
```

## Deploy en Vercel

El proyecto incluye `vercel.json` con la configuración del framework Vite y
los rewrites necesarios para SPA. Tras conectarlo en Vercel:

1. Configura las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. Añade el dominio de Vercel a **Supabase → Authentication → URL Configuration**
   (Site URL y Redirect URLs).
3. Aplica las migraciones SQL de `supabase/migrations/` en tu proyecto Supabase.
