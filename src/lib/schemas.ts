import { z } from 'zod'

// ------------------------------------------------------------------
// Helpers de conversión (de string-de-formulario a tipo de DB)
// ------------------------------------------------------------------
const numOrNull = (s: string | undefined | null) => {
  if (s == null) return null
  const t = String(s).trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const requiredNum = (s: string) => {
  const n = Number(String(s).trim())
  return Number.isFinite(n) ? n : 0
}
const strOrNull = (s: string | undefined | null) => {
  if (s == null) return null
  const t = String(s).trim()
  return t === '' ? null : t
}

const positiveNumberStr = z.string().refine((s) => {
  const n = Number(String(s).trim())
  return Number.isFinite(n) && n > 0
}, 'Debe ser un número mayor que 0')

const nonNegativeNumberStr = z.string().refine((s) => {
  const n = Number(String(s).trim())
  return Number.isFinite(n) && n >= 0
}, 'Debe ser un número válido')

// ------------------------------------------------------------------
// Vehicle
// ------------------------------------------------------------------
export const vehicleSchema = z.object({
  plate: z.string().min(3, 'Placa requerida').max(10),
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  year: z.string().optional(),
  color: z.string().optional(),
  vehicle_type: z.enum(['moto', 'carro', 'camioneta', 'otro']),
  daily_rate: positiveNumberStr,
  weekly_rate: z.string().optional(),
  monthly_rate: z.string().optional(),
  status: z.enum(['disponible', 'alquilado', 'mantenimiento', 'inactivo']),
  mileage_km: z.string().optional(),
  notes: z.string().optional(),
})
export type VehicleInput = z.infer<typeof vehicleSchema>

export function cleanVehicle(v: VehicleInput) {
  return {
    plate: v.plate.trim().toUpperCase(),
    brand: v.brand.trim(),
    model: v.model.trim(),
    year: numOrNull(v.year),
    color: strOrNull(v.color),
    vehicle_type: v.vehicle_type,
    daily_rate: requiredNum(v.daily_rate),
    weekly_rate: numOrNull(v.weekly_rate),
    monthly_rate: numOrNull(v.monthly_rate),
    status: v.status,
    mileage_km: numOrNull(v.mileage_km),
    notes: strOrNull(v.notes),
  }
}

// ------------------------------------------------------------------
// Client
// ------------------------------------------------------------------
export const clientSchema = z.object({
  document_type: z.enum(['CC', 'CE', 'TI', 'PAS', 'NIT']),
  document_number: z.string().min(3, 'Documento requerido'),
  full_name: z.string().min(3, 'Nombre requerido'),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (s) => !s || s.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
      'Correo inválido'
    ),
  address: z.string().optional(),
  city: z.string().optional(),
  birth_date: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  blacklisted: z.boolean(),
  notes: z.string().optional(),
})
export type ClientInput = z.infer<typeof clientSchema>

export function cleanClient(c: ClientInput) {
  return {
    document_type: c.document_type,
    document_number: c.document_number.trim(),
    full_name: c.full_name.trim(),
    phone: strOrNull(c.phone),
    email: strOrNull(c.email),
    address: strOrNull(c.address),
    city: strOrNull(c.city),
    birth_date: strOrNull(c.birth_date),
    license_number: strOrNull(c.license_number),
    license_expiry: strOrNull(c.license_expiry),
    blacklisted: c.blacklisted,
    notes: strOrNull(c.notes),
  }
}

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
    rate_value: nonNegativeNumberStr,
    deposit: z.string().optional(),
    total_amount: nonNegativeNumberStr,
    status: z.enum([
      'borrador',
      'activo',
      'finalizado',
      'cancelado',
      'vencido',
    ]),
    notes: z.string().optional(),
  })
  .refine((v) => new Date(v.end_date) >= new Date(v.start_date), {
    message: 'La fecha de fin debe ser igual o posterior a la de inicio',
    path: ['end_date'],
  })

export type ContractInput = z.infer<typeof contractSchema>

export function cleanContract(c: ContractInput) {
  return {
    contract_number: c.contract_number.trim(),
    client_id: c.client_id,
    vehicle_id: c.vehicle_id,
    start_date: c.start_date,
    end_date: c.end_date,
    rate_type: c.rate_type,
    rate_value: requiredNum(c.rate_value),
    deposit: numOrNull(c.deposit),
    total_amount: requiredNum(c.total_amount),
    status: c.status,
    notes: strOrNull(c.notes),
  }
}
