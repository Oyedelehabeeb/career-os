import { z } from 'zod'

const optionalEmail = z.union([z.email(), z.literal('')])
const optionalUrl = z.union([
  z.url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'Use a full HTTP or HTTPS URL.',
  }),
  z.literal(''),
])

export const interviewTypes = [
  'recruiter_screen',
  'hiring_manager',
  'technical',
  'portfolio',
  'case_study',
  'panel',
  'final',
  'other',
] as const

export const interviewStatuses = [
  'scheduled',
  'completed',
  'cancelled',
] as const
export const interviewOutcomes = [
  'advanced',
  'no_decision',
  'rejected',
  'offer',
  'withdrawn',
] as const

export const interviewTypeLabels: Record<
  (typeof interviewTypes)[number],
  string
> = {
  recruiter_screen: 'Recruiter screen',
  hiring_manager: 'Hiring manager',
  technical: 'Technical interview',
  portfolio: 'Portfolio review',
  case_study: 'Case study',
  panel: 'Panel interview',
  final: 'Final interview',
  other: 'Other',
}

const contactFieldsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().max(160),
  email: optionalEmail,
  profileUrl: optionalUrl,
  notes: z.string().trim().max(5000),
})

export const createContactSchema = contactFieldsSchema.extend({
  opportunityId: z.uuid(),
})
export const updateContactSchema = contactFieldsSchema.extend({
  opportunityId: z.uuid(),
  contactId: z.uuid(),
})

const interviewFieldsSchema = z.object({
  contactId: z.union([z.uuid(), z.null()]),
  interviewType: z.enum(interviewTypes),
  stage: z.string().trim().max(120),
  scheduledAt: z.iso.datetime(),
  durationMinutes: z.union([z.number().int().min(15).max(480), z.null()]),
  locationOrUrl: z.string().trim().max(1000),
  status: z.enum(interviewStatuses),
  outcome: z.union([z.enum(interviewOutcomes), z.null()]),
  preparationNotes: z.string().trim().max(10000),
  postInterviewNotes: z.string().trim().max(10000),
})

export const createInterviewSchema = interviewFieldsSchema.extend({
  opportunityId: z.uuid(),
})
export const updateInterviewSchema = interviewFieldsSchema.extend({
  opportunityId: z.uuid(),
  interviewId: z.uuid(),
})

export const createNoteSchema = z.object({
  opportunityId: z.uuid(),
  body: z.string().trim().min(1).max(10000),
})
export const updateNoteSchema = createNoteSchema.extend({ noteId: z.uuid() })
export const opportunityRecordsInputSchema = z.object({
  opportunityId: z.uuid(),
})

export type OpportunityContact = {
  id: string
  name: string
  role: string
  email: string
  profileUrl: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type OpportunityInterview = {
  id: string
  contactId: string | null
  contactName: string | null
  interviewType: (typeof interviewTypes)[number]
  stage: string
  scheduledAt: string
  durationMinutes: number | null
  locationOrUrl: string
  status: (typeof interviewStatuses)[number]
  outcome: (typeof interviewOutcomes)[number] | null
  preparationNotes: string
  postInterviewNotes: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type OpportunityNote = {
  id: string
  body: string
  createdAt: string
  updatedAt: string
}

export type OpportunityRecords = {
  contacts: OpportunityContact[]
  interviews: OpportunityInterview[]
  notes: OpportunityNote[]
}

export type TimelineSource = OpportunityRecords & {
  history: Array<{
    id: string
    fromStatus: string | null
    toStatus: string
    occurredAt: string
  }>
  followUps: Array<{
    id: string
    title: string
    dueAt: string
    completedAt: string | null
    createdAt: string
  }>
}

export type TimelineItem = {
  id: string
  kind: 'status' | 'contact' | 'interview' | 'note' | 'follow_up'
  title: string
  detail: string
  occurredAt: string
}

function excerpt(value: string, max = 120) {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function buildOpportunityTimeline(
  source: TimelineSource,
): TimelineItem[] {
  const items: TimelineItem[] = []
  for (const event of source.history)
    items.push({
      id: `status-${event.id}`,
      kind: 'status',
      title: event.fromStatus
        ? `Status changed to ${event.toStatus.replace('_', ' ')}`
        : `Opportunity saved as ${event.toStatus.replace('_', ' ')}`,
      detail: event.fromStatus
        ? `Previously ${event.fromStatus.replace('_', ' ')}`
        : 'Application history started',
      occurredAt: event.occurredAt,
    })
  for (const contact of source.contacts)
    items.push({
      id: `contact-${contact.id}`,
      kind: 'contact',
      title: `${contact.name} added as a contact`,
      detail: contact.role || contact.email || 'Opportunity contact',
      occurredAt: contact.createdAt,
    })
  for (const interview of source.interviews) {
    items.push({
      id: `interview-${interview.id}`,
      kind: 'interview',
      title: `${interviewTypeLabels[interview.interviewType]} scheduled`,
      detail: interview.contactName
        ? `With ${interview.contactName}`
        : interview.stage || 'Interview recorded',
      occurredAt: interview.createdAt,
    })
    if (interview.completedAt)
      items.push({
        id: `interview-completed-${interview.id}`,
        kind: 'interview',
        title: `${interviewTypeLabels[interview.interviewType]} completed`,
        detail: interview.outcome
          ? `Outcome: ${interview.outcome.replace('_', ' ')}`
          : 'No outcome recorded yet',
        occurredAt: interview.completedAt,
      })
  }
  for (const note of source.notes)
    items.push({
      id: `note-${note.id}`,
      kind: 'note',
      title: 'Note added',
      detail: excerpt(note.body),
      occurredAt: note.createdAt,
    })
  for (const followUp of source.followUps) {
    items.push({
      id: `follow-up-${followUp.id}`,
      kind: 'follow_up',
      title: 'Follow-up scheduled',
      detail: followUp.title,
      occurredAt: followUp.createdAt,
    })
    if (followUp.completedAt)
      items.push({
        id: `follow-up-completed-${followUp.id}`,
        kind: 'follow_up',
        title: 'Follow-up completed',
        detail: followUp.title,
        occurredAt: followUp.completedAt,
      })
  }
  return items.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}
