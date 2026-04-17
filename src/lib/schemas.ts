import { z } from 'zod'

// ------------------------------------------------------------------
// Preprocesadores
// ------------------------------------------------------------------
const emptyToUndef = (v: unknown) =>
  v === '' || v === null ? undefined : v
const toNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Debe ser numérico' })
)
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().optional()
)
const optionalString = z.preprocess(emptyToUndef, z.string().optional())

// ------------------------------------------------------------------
// Vehicle
// ------------------------------------------------------------------
export const vehicleSchema = z.object({
  plate: z.string().min(3, 'Placa requerida').max(10),
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  year: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z
      .number()
      .int()
      .min(1950, 'Año inválido')
      .max(new Date().getFullYear() + 1, 'Año inválido')
      .optional()
  ),
  color: optionalString,
  vehicle_type: z.enum(['moto', 'carro', 'camioneta', 'otro']),
  daily_rate: toNumber.pipe(z.number().min(0, 'Tarifa inválida')),
  weekly_rate: optionalNumber.pipe(z.number().min(0).optional()),
  monthly_rate: optionalNumber.pipe(z.number().min(0).optional()),
  status: z.enum(['disponible', 'alquilado', 'mantenimiento', 'inactivo']),
  mileage_km: optionalNumber.pipe(z.number().int().min(0).optional()),
  notes: optionalString,
})
export type VehicleInput = z.infer<typeof vehicleSchema>

// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------
export const clientSchema = z.object({
  document_type: z.enum(['CC', 'CE', 'TI', 'PAS', 'NIT']),
  document_number: z.string().min(3, 'Documento requerido'),
  full_name: z.string().min(3, 'Nombre requerido'),
  phone: optionalString,
  email: z.preprocess(
    emptyToUndef,
    z.string().email('Correo inválido').optional()
  ),
  address: optionalString,
  city: optionalString,
  birth_date: optionalString,
  license_number: optionalString,
  license_expiry: optionalString,
  blacklisted: z.boolean().default(false),
  notes: optionalString,
})
export type ClientInput = z.infer<typeof clientSchema>

// ------------------------------------------------------------------
// Contract
// ------------------------------------------------------------------
export const contractSchema = z
  .object({
    contract_number: z.string().min(1, 'Número requerido'),
    client_id: z.string().uuid('Cliente requerido'),
    vehicle_id: z.string().uuid('Vehículo requerido'),
    start_date: z.string().min(1, 'Fecha de inicio requerida'),
    end_date: z.string().min(1, 'Fecha de fin requerida'),
    rate_type: z.enum(['diaria', 'semanal', 'mensual']),
    rate_value: toNumber.pipe(z.number().min(0, 'Tarifa inválida')),
    deposit: optionalNumber.pipe(z.number().min(0).optional()),
    total_amount: toNumber.pipe(z.number().min(0, 'Total inválido')),
    status: z.enum([
      'borrador',
      'activo',
      'finalizado',
      'cancelado',
      'vencido',
    ]),
    notes: optionalString,
  })
  .refine((v) => new Date(v.end_date) >= new Date(v.start_date), {
    message: 'La fecha de fin debe ser igual o posterior a la de inicio',
    path: ['end_date'],
  })

export type ContractInput = z.infer<typeof contractSchema>
