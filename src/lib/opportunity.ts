import { z } from 'zod'

const jobUrlSchema = z.union([
  z.url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'Use an HTTP or HTTPS job URL.',
  }),
  z.literal(''),
])

export const opportunityStatuses = [
  'saved',
  'preparing',
  'applied',
  'screening',
  'interview',
  'final_round',
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
  'closed',
] as const

export type OpportunityStatus = (typeof opportunityStatuses)[number]

export const statusLabels: Record<OpportunityStatus, string> = {
  saved: 'Saved',
  preparing: 'Preparing',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  final_round: 'Final round',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
  closed: 'Closed',
}

export const createOpportunitySchema = z
  .object({
    companyName: z.string().trim().max(200),
    title: z.string().trim().max(250),
    location: z.string().trim().max(200),
    sourceUrl: jobUrlSchema,
    jobDescription: z.string().trim().max(100_000),
    priority: z.enum(['low', 'medium', 'high']),
  })
  .refine(
    (value) =>
      Boolean(
        value.companyName ||
        value.title ||
        value.sourceUrl ||
        value.jobDescription,
      ),
    { message: 'Add at least a company, role, URL, or job description.' },
  )

export type CreateOpportunityInput = z.input<typeof createOpportunitySchema>

export const editOpportunitySchema = z
  .object({
    opportunityId: z.uuid(),
    companyName: z.string().trim().max(200),
    title: z.string().trim().max(250),
    location: z.string().trim().max(200),
    workMode: z.enum(['remote', 'hybrid', 'on_site', 'unspecified']),
    sourceUrl: jobUrlSchema,
    jobDescription: z.string().trim().max(100_000),
    priority: z.enum(['low', 'medium', 'high']),
  })
  .refine(
    (value) =>
      Boolean(
        value.companyName ||
        value.title ||
        value.sourceUrl ||
        value.jobDescription,
      ),
    { message: 'Keep at least a company, role, URL, or job description.' },
  )

export const createFollowUpSchema = z.object({
  opportunityId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  dueAt: z.iso.datetime(),
})

export const completeFollowUpSchema = z.object({
  followUpId: z.uuid(),
  opportunityId: z.uuid(),
})

export const changeStatusSchema = z.object({
  opportunityId: z.uuid(),
  status: z.enum(opportunityStatuses),
})

export type OpportunitySummary = {
  id: string
  companyId: string | null
  companyName: string | null
  title: string | null
  location: string | null
  status: OpportunityStatus
  priority: 'low' | 'medium' | 'high'
  savedAt: string
  isSample: boolean
}
