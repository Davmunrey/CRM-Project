import { z } from 'zod'
import type { Translations } from '../../i18n/types'

export const createActivitySchema = (t: Translations) =>
  z.object({
    type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'linkedin']),
    subject: z.string().min(1, t.formErrors.activitySubjectRequired),
    description: z.string(),
    outcome: z.string(),
    dueDate: z.string(),
    status: z.enum(['pending', 'completed', 'cancelled']),
    contactId: z.string(),
    dealId: z.string(),
    createdBy: z.string().min(1, t.formErrors.activityCreatedByRequired),
  })

export type ActivityFormData = z.infer<ReturnType<typeof createActivitySchema>>
