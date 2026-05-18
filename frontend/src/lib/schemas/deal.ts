import { z } from 'zod'
import type { Translations } from '../../i18n/types'

export const createDealSchema = (t: Translations, availableStages: string[]) =>
  z.object({
    title: z.string().min(1, t.formErrors.dealTitleRequired),
    value: z.string().min(1, t.formErrors.dealValueRequired),
    currency: z.enum(['EUR', 'USD', 'GBP']),
    stage: z
      .string()
      .min(1, t.formErrors.dealStageRequired)
      .refine((value) => availableStages.includes(value), {
        message: t.formErrors.dealStageInvalid,
      }),
    probability: z.string(),
    expectedCloseDate: z.string().min(1, t.formErrors.dealExpectedCloseRequired),
    contactId: z.string(),
    companyId: z.string(),
    assignedTo: z.string().min(1, t.formErrors.dealAssignedToRequired),
    priority: z.enum(['low', 'medium', 'high']),
    source: z.string(),
    notes: z.string(),
  })

export type DealFormData = z.infer<ReturnType<typeof createDealSchema>>
