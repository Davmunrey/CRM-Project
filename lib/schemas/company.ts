import { z } from 'zod'
import type { Translations } from '../../i18n/types'

export const createCompanySchema = (t: Translations) =>
  z.object({
    name: z.string().min(1, t.formErrors.companyNameRequired),
    domain: z.string(),
    industry: z.string().min(1, t.formErrors.companyIndustryRequired),
    size: z.string(),
    country: z.string(),
    city: z.string(),
    website: z.string(),
    phone: z.string(),
    status: z.enum(['prospect', 'customer', 'partner', 'churned']),
    revenue: z.string(),
    notes: z.string(),
  })

export type CompanyFormData = z.infer<ReturnType<typeof createCompanySchema>>
