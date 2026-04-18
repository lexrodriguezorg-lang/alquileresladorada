// =============================================================
// Tipos TypeScript del esquema Supabase
// Refleja las tablas definidas en supabase/migrations/0001_init_schema.sql
// =============================================================

// ---------- Enums / literales ----------
export type VehicleType = 'moto' | 'carro' | 'camioneta' | 'otro'
export type VehicleStatus =
  | 'disponible'
  | 'alquilado'
  | 'mantenimiento'
  | 'inactivo'

export type DocumentType = 'CC' | 'CE' | 'TI' | 'PAS' | 'NIT'

export type ContractStatus =
  | 'borrador'
  | 'activo'
  | 'finalizado'
  | 'cancelado'
  | 'vencido'
export type RateType = 'diaria' | 'semanal' | 'mensual'

export type BookingStatus =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'cumplida'
  | 'no_show'

export type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'nequi'
  | 'daviplata'
  | 'tarjeta'
  | 'otro'
export type PaymentConcept =
  | 'alquiler'
  | 'deposito'
  | 'multa'
  | 'reparacion'
  | 'otro'

export type AlertType =
  | 'contrato_vencido'
  | 'contrato_por_vencer'
  | 'pago_pendiente'
  | 'mantenimiento'
  | 'licencia_vencida'
  | 'reserva_proxima'
  | 'otro'
export type AlertSeverity = 'baja' | 'media' | 'alta' | 'critica'

// ---------- Filas ----------
export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number | null
  color: string | null
  vehicle_type: VehicleType
  daily_rate: number
  weekly_rate: number | null
  monthly_rate: number | null
  status: VehicleStatus
  mileage_km: number | null
  engine_cc: number | null
  engine_liters: number | null
  photos: string[] | null
  notes: string | null
  // Vencimientos legales (migration 0004)
  soat_expiry: string | null
  rtm_expiry: string | null
  // Configuración específica (migration 0004)
  specific_deposit: number | null
  requirements_specific: string | null
  zone_restrictions: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  document_type: DocumentType
  document_number: string
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  birth_date: string | null
  license_number: string | null
  license_expiry: string | null
  blacklisted: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  contract_number: string
  client_id: string
  vehicle_id: string
  start_date: string
  end_date: string
  rate_type: RateType
  rate_value: number
  deposit: number | null
  total_amount: number
  status: ContractStatus
  signed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  client_id: string
  vehicle_id: string
  contract_id: string | null
  start_at: string
  end_at: string
  status: BookingStatus
  advance_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  contract_id: string | null
  booking_id: string | null
  client_id: string
  amount: number
  payment_date: string
  method: PaymentMethod
  concept: PaymentConcept
  reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string | null
  vehicle_id: string | null
  client_id: string | null
  contract_id: string | null
  booking_id: string | null
  is_read: boolean
  resolved: boolean
  due_at: string | null
  created_at: string
  updated_at: string
}

// ---------- Tipos de inserción/actualización ----------
type WithMeta = { id: string; created_at: string; updated_at: string }
export type Insert<T extends WithMeta> = Omit<T, keyof WithMeta> &
  Partial<Pick<T, 'id'>>
export type Update<T extends WithMeta> = Partial<Omit<T, keyof WithMeta>>

// ---------- Database (forma estilo supabase-js) ----------
export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: Vehicle
        Insert: Insert<Vehicle>
        Update: Update<Vehicle>
      }
      clients: {
        Row: Client
        Insert: Insert<Client>
        Update: Update<Client>
      }
      contracts: {
        Row: Contract
        Insert: Insert<Contract>
        Update: Update<Contract>
      }
      bookings: {
        Row: Booking
        Insert: Insert<Booking>
        Update: Update<Booking>
      }
      payments: {
        Row: Payment
        Insert: Insert<Payment>
        Update: Update<Payment>
      }
      alerts: {
        Row: Alert
        Insert: Insert<Alert>
        Update: Update<Alert>
      }
    }
    Functions: {
      submit_booking_request: {
        Args: {
          p_full_name: string
          p_document_number: string
          p_phone: string
          p_email: string
          p_vehicle_id: string
          p_start_at: string
          p_end_at: string
          p_notes: string
        }
        Returns: string
      }
    }
  }
}

// ---------- Vistas derivadas útiles en el Dashboard ----------
export interface ContractWithRelations extends Contract {
  client?: Pick<Client, 'id' | 'full_name' | 'document_number'> | null
  vehicle?: Pick<Vehicle, 'id' | 'plate' | 'brand' | 'model'> | null
}

export interface FleetStats {
  total: number
  rented: number
  available: number
  maintenance: number
  inactive: number
}
