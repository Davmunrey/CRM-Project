import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createContactSchema } from '../../lib/schemas/contact'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import type { Contact } from '../../types'
import { useCompaniesStore } from '../../store/companiesStore'
import { useAuthStore } from '../../store/authStore'
import { CustomFieldsForm } from '../shared/CustomFieldRenderer'
import { useLocalizedCompanies, useLocalizedOrgUsers, useTranslations } from '../../i18n'

type FormValues = z.infer<ReturnType<typeof createContactSchema>>

interface ContactFormProps {
  contact?: Contact
  onSubmit: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'linkedDeals' | 'lastContactedAt'>) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ContactForm({ contact, onSubmit, onCancel, isLoading }: ContactFormProps) {
  const t = useTranslations()
  const companies = useLocalizedCompanies(useCompaniesStore((s) => s.companies))
  const orgUsers = useLocalizedOrgUsers(useAuthStore((s) => s.users))
  const schema = useMemo(() => createContactSchema(t), [t])

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: contact?.firstName ?? '',
      lastName: contact?.lastName ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      jobTitle: contact?.jobTitle ?? '',
      companyId: contact?.companyId ?? '',
      status: contact?.status ?? 'prospect',
      source: contact?.source ?? 'website',
      assignedTo: contact?.assignedTo ?? (orgUsers[0]?.name ?? ''),
      notes: contact?.notes ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label={t.contacts.firstName} required error={errors.firstName?.message} {...register('firstName')} />
        <Input label={t.contacts.lastName} required error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <Input label={t.common.email} type="email" required error={errors.email?.message} {...register('email')} />
      <Input label={t.common.phone} type="tel" {...register('phone')} />
      <Input label={t.contacts.jobTitle} {...register('jobTitle')} />

      <Select
        control={control}
        name="companyId"
        label={t.contacts.company}
        options={[
          { value: '', label: t.contacts.noCompany },
          ...companies.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          control={control}
          name="status"
          label={t.common.status}
          required
          options={[
            { value: 'prospect', label: t.contacts.statusLabels.prospect },
            { value: 'customer', label: t.contacts.statusLabels.customer },
            { value: 'churned', label: t.contacts.statusLabels.churned },
          ]}
          error={errors.status?.message}
        />
        <Select
          control={control}
          name="source"
          label={t.contacts.source}
          required
          options={[
            { value: 'website', label: t.contacts.sourceLabels.website },
            { value: 'referral', label: t.contacts.sourceLabels.referral },
            { value: 'outbound', label: t.contacts.sourceLabels.outbound },
            { value: 'event', label: t.contacts.sourceLabels.event },
            { value: 'linkedin', label: t.contacts.sourceLabels.linkedin },
            { value: 'other', label: t.contacts.sourceLabels.other },
          ]}
          error={errors.source?.message}
        />
      </div>

      <Select
        control={control}
        name="assignedTo"
        label={t.common.assignedTo}
        required
        options={orgUsers.map((u) => ({ value: u.name, label: u.name }))}
        error={errors.assignedTo?.message}
      />

      <Textarea label={t.common.notes} rows={3} {...register('notes')} />

      {contact && (
        <CustomFieldsForm entityId={contact.id} entityType="contact" />
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isLoading} className="flex-1">
          {contact ? t.common.save : t.contacts.createContact}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  )
}
