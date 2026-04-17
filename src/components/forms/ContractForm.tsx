import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../../lib/supabase'
import { contractSchema, type ContractInput } from '../../lib/schemas'
import FormField, { inputCls, btnPrimary, btnSecondary } from '../FormField'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

interface ClientOption {
  id: string
  full_name: string
  document_number: string
}
interface VehicleOption {
  id: string
  plate: string
  brand: string
  model: string
}

export default function ContractForm({ onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [loadingOpts, setLoadingOpts] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContractInput>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      rate_type: 'diaria',
      status: 'activo',
      contract_number: `C-${Date.now().toString().slice(-6)}`,
    },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [cRes, vRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name, document_number')
          .eq('blacklisted', false)
          .order('full_name'),
        supabase
          .from('vehicles')
          .select('id, plate, brand, model')
          .in('status', ['disponible', 'alquilado'])
          .order('plate'),
      ])
      if (cancelled) return
      setClients((cRes.data ?? []) as ClientOption[])
      setVehicles((vRes.data ?? []) as VehicleOption[])
      setLoadingOpts(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (values: ContractInput) => {
    setServerError(null)
    const { error } = await supabase.from('contracts').insert(values)
    if (error) return setServerError(error.message)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
      <FormField
        label="Nº contrato"
        error={errors.contract_number?.message}
        span="half"
      >
        <input {...register('contract_number')} className={inputCls} />
      </FormField>
      <FormField label="Estado" error={errors.status?.message} span="half">
        <select {...register('status')} className={inputCls}>
          <option value="borrador">Borrador</option>
          <option value="activo">Activo</option>
          <option value="finalizado">Finalizado</option>
          <option value="cancelado">Cancelado</option>
          <option value="vencido">Vencido</option>
        </select>
      </FormField>

      <FormField label="Cliente" error={errors.client_id?.message} span="full">
        <select {...register('client_id')} className={inputCls}>
          <option value="">
            {loadingOpts ? 'Cargando…' : 'Selecciona un cliente'}
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} — {c.document_number}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Vehículo"
        error={errors.vehicle_id?.message}
        span="full"
      >
        <select {...register('vehicle_id')} className={inputCls}>
          <option value="">
            {loadingOpts ? 'Cargando…' : 'Selecciona un vehículo'}
          </option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} — {v.brand} {v.model}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Fecha inicio"
        error={errors.start_date?.message}
        span="half"
      >
        <input type="date" {...register('start_date')} className={inputCls} />
      </FormField>
      <FormField
        label="Fecha fin"
        error={errors.end_date?.message}
        span="half"
      >
        <input type="date" {...register('end_date')} className={inputCls} />
      </FormField>

      <FormField
        label="Tipo de tarifa"
        error={errors.rate_type?.message}
        span="half"
      >
        <select {...register('rate_type')} className={inputCls}>
          <option value="diaria">Diaria</option>
          <option value="semanal">Semanal</option>
          <option value="mensual">Mensual</option>
        </select>
      </FormField>
      <FormField
        label="Valor tarifa"
        error={errors.rate_value?.message}
        span="half"
      >
        <input
          type="number"
          step="any"
          {...register('rate_value')}
          className={inputCls}
        />
      </FormField>

      <FormField label="Depósito" error={errors.deposit?.message} span="half">
        <input
          type="number"
          step="any"
          {...register('deposit')}
          className={inputCls}
        />
      </FormField>
      <FormField
        label="Total"
        error={errors.total_amount?.message}
        span="half"
      >
        <input
          type="number"
          step="any"
          {...register('total_amount')}
          className={inputCls}
        />
      </FormField>

      <FormField label="Notas" error={errors.notes?.message} span="full">
        <textarea
          {...register('notes')}
          className={`${inputCls} min-h-[80px]`}
        />
      </FormField>

      {serverError && (
        <div className="col-span-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand">
          {serverError}
        </div>
      )}

      <div className="col-span-2 flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className={btnPrimary}>
          {isSubmitting ? 'Guardando…' : 'Crear contrato'}
        </button>
      </div>
    </form>
  )
}
