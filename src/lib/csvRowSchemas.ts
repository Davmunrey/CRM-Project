import { z } from 'zod'

const contactStatus = z.enum(['lead', 'prospect', 'customer', 'churned'])
const contactSource = z.enum(['website', 'referral', 'outbound', 'event', 'linkedin', 'other'])

export const csvContactRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().default(''),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  jobTitle: z.string().optional().default(''),
  status: z.string().optional().default('lead'),
  source: z.string().optional().default('other'),
  notes: z.string().optional().default(''),
})

export const csvCompanyRowSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  size: z.string().optional().default(''),
  country: z.string().optional().default(''),
  city: z.string().optional().default(''),
  website: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export function parseContactStatus(raw: string): z.infer<typeof contactStatus> {
  const s = contactStatus.safeParse(raw)
  return s.success ? s.data : 'lead'
}

export function parseContactSource(raw: string): z.infer<typeof contactSource> {
  const s = contactSource.safeParse(raw)
  return s.success ? s.data : 'other'
}

export function safeParseContactRow(record: Record<string, string>) {
  return csvContactRowSchema.safeParse(record)
}

export function safeParseCompanyRow(record: Record<string, string>) {
  return csvCompanyRowSchema.safeParse(record)
}
