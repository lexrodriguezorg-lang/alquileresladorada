import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { vehicleSchema, type VehicleInput } from '../../lib/schemas'
import FormField, { inputCls, btnPrimary, btnSecondary } from '../FormField'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function VehicleForm({ onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vehicle_type: 'moto',
      status: 'disponible',
    },
  })

  const onSubmit = async (values: VehicleInput) => {
    setServerError(null)
    const { error } = await supabase.from('vehicles').insert(values)
    if (error) return setServerError(error.message)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
      <FormField label="Placa" error={errors.plate?.message} span="half">
        <input
          {...register('plate')}
          className={inputCls}
          placeholder="ABC-123"
        />
      </FormField>
      <FormField label="Tipo" error={errors.vehicle_type?.message} span="half">
        <select {...register('vehicle_type')} className={inputCls}>
          <option value="moto">Moto</option>
          <option value="carro">Carro</option>
          <option value="camioneta">Camioneta</option>
          <option value="otro">Otro</option>
        </select>
      </FormField>

      <FormField label="Marca" error={errors.brand?.message} span="half">
        <input {...register('brand')} className={inputCls} />
      </FormField>
      <FormField label="Modelo" error={errors.model?.message} span="half">
        <input {...register('model')} className={inputCls} />
      </FormField>

      <FormField label="Año" error={errors.year?.message} span="half">
        <input
          type="number"
          {...register('year')}
          className={inputCls}
          placeholder="2023"
        />
      </FormField>
      <FormField label="Color" error={errors.color?.message} span="half">
        <input {...register('color')} className={inputCls} />
      </FormField>

      <FormField
        label="Tarifa diaria (COP)"
        error={errors.daily_rate?.message}
        span="half"
      >
        <input
          type="number"
          step="any"
          {...register('daily_rate')}
          className={inputCls}
          placeholder="50000"
        />
      </FormField>
      <FormField label="Estado" error={errors.status?.message} span="half">
        <select {...register('status')} className={inputCls}>
          <option value="disponible">Disponible</option>
          <option value="alquilado">Alquilado</option>
          <option value="mantenimiento">Mantenimiento</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </FormField>

      <FormField
        label="Tarifa semanal"
        error={errors.weekly_rate?.message}
        span="half"
      >
        <input
          type="number"
          step="any"
          {...register('weekly_rate')}
          className={inputCls}
        />
      </FormField>
      <FormField
        label="Tarifa mensual"
        error={errors.monthly_rate?.message}
        span="half"
      >
        <input
          type="number"
          step="any"
          {...register('monthly_rate')}
          className={inputCls}
        />
      </FormField>

      <FormField
        label="Kilometraje"
        error={errors.mileage_km?.message}
        span="half"
      >
        <input
          type="number"
          {...register('mileage_km')}
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
          {isSubmitting ? 'Guardando…' : 'Crear vehículo'}
        </button>
      </div>
    </form>
  )
}
