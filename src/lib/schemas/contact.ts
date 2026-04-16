import { z } from 'zod'
import type { Translations } from '../../i18n/types'

export const createContactSchema = (t: Translations) =>
  z.object({
    firstName: z.string().min(1, t.formErrors.contactFirstNameRequired),
    lastName: z.string().min(1, t.formErrors.contactLastNameRequired),
    email: z.string().email(t.formErrors.invalidEmail),
    phone: z.string(),
    jobTitle: z.string(),
    companyId: z.string(),
    status: z.enum(['prospect', 'customer', 'churned']),
    source: z.enum(['website', 'referral', 'outbound', 'event', 'linkedin', 'other']),
    assignedTo: z.string().min(1, t.formErrors.contactAssignedToRequired),
    notes: z.string(),
  })

export type ContactFormData = z.infer<ReturnType<typeof createContactSchema>>
