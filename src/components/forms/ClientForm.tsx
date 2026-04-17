import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { clientSchema, cleanClient, type ClientInput } from '../../lib/schemas'
import FormField, { inputCls, btnPrimary, btnSecondary } from '../FormField'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function ClientForm({ onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      document_type: 'CC',
      city: 'La Dorada',
      blacklisted: false,
    },
  })

  const onSubmit = async (values: ClientInput) => {
    setServerError(null)
    const { error } = await supabase.from('clients').insert(cleanClient(values))
    if (error) return setServerError(error.message)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
      <FormField
        label="Tipo de documento"
        error={errors.document_type?.message}
        span="half"
      >
        <select {...register('document_type')} className={inputCls}>
          <option value="CC">CC</option>
          <option value="CE">CE</option>
          <option value="TI">TI</option>
          <option value="PAS">Pasaporte</option>
          <option value="NIT">NIT</option>
        </select>
      </FormField>
      <FormField
        label="Nº documento"
        error={errors.document_number?.message}
        span="half"
      >
        <input {...register('document_number')} className={inputCls} />
      </FormField>

      <FormField
        label="Nombre completo"
        error={errors.full_name?.message}
        span="full"
      >
        <input {...register('full_name')} className={inputCls} />
      </FormField>

      <FormField label="Teléfono" error={errors.phone?.message} span="half">
        <input {...register('phone')} className={inputCls} />
      </FormField>
      <FormField label="Correo" error={errors.email?.message} span="half">
        <input type="email" {...register('email')} className={inputCls} />
      </FormField>

      <FormField label="Dirección" error={errors.address?.message} span="full">
        <input {...register('address')} className={inputCls} />
      </FormField>

      <FormField label="Ciudad" error={errors.city?.message} span="half">
        <input {...register('city')} className={inputCls} />
      </FormField>
      <FormField
        label="Fecha de nacimiento"
        error={errors.birth_date?.message}
        span="half"
      >
        <input type="date" {...register('birth_date')} className={inputCls} />
      </FormField>

      <FormField
        label="Licencia de conducción"
        error={errors.license_number?.message}
        span="half"
      >
        <input {...register('license_number')} className={inputCls} />
      </FormField>
      <FormField
        label="Vencimiento licencia"
        error={errors.license_expiry?.message}
        span="half"
      >
        <input
          type="date"
          {...register('license_expiry')}
          className={inputCls}
        />
      </FormField>

      <FormField label="Notas" error={errors.notes?.message} span="full">
        <textarea
          {...register('notes')}
          className={`${inputCls} min-h-[80px]`}
        />
      </FormField>

      <label className="col-span-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
        <input
          type="checkbox"
          {...register('blacklisted')}
          className="accent-[#E8192C]"
        />
        Cliente vetado
      </label>

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
          {isSubmitting ? 'Guardando…' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}
