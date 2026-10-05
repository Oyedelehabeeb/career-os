import { createServerFn } from '@tanstack/react-start'

import {
  createContactSchema,
  createInterviewSchema,
  createNoteSchema,
  opportunityRecordsInputSchema,
  updateContactSchema,
  updateInterviewSchema,
  updateNoteSchema,
} from '../lib/opportunity-records'
import { createClient } from '../lib/supabase/server'
import type {
  OpportunityContact,
  OpportunityInterview,
  OpportunityNote,
  OpportunityRecords,
} from '../lib/opportunity-records'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

const contactSelection =
  'id, name, role, email, profile_url, notes, created_at, updated_at'
const interviewSelection =
  'id, contact_id, interview_type, stage, scheduled_at, duration_minutes, location_or_url, status, outcome, preparation_notes, post_interview_notes, completed_at, created_at, updated_at'
const noteSelection = 'id, body, created_at, updated_at'

function mapContact(row: Record<string, unknown>): OpportunityContact {
  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role ?? ''),
    email: String(row.email ?? ''),
    profileUrl: String(row.profile_url ?? ''),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapInterview(
  row: Record<string, unknown>,
  contactNames: Map<string, string>,
): OpportunityInterview {
  const contactId = row.contact_id ? String(row.contact_id) : null
  return {
    id: String(row.id),
    contactId,
    contactName: contactId ? (contactNames.get(contactId) ?? null) : null,
    interviewType: row.interview_type as OpportunityInterview['interviewType'],
    stage: String(row.stage ?? ''),
    scheduledAt: String(row.scheduled_at),
    durationMinutes:
      row.duration_minutes === null ? null : Number(row.duration_minutes),
    locationOrUrl: String(row.location_or_url ?? ''),
    status: row.status as OpportunityInterview['status'],
    outcome: row.outcome as OpportunityInterview['outcome'],
    preparationNotes: String(row.preparation_notes ?? ''),
    postInterviewNotes: String(row.post_interview_notes ?? ''),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapNote(row: Record<string, unknown>): OpportunityNote {
  return {
    id: String(row.id),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

async function ensureContact(
  supabase: ReturnType<typeof createClient>,
  opportunityId: string,
  contactId: string | null,
) {
  if (!contactId) return
  const contact = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .eq('opportunity_id', opportunityId)
    .maybeSingle()
  if (contact.error || !contact.data)
    throw new Error('Choose a contact from this opportunity.')
}

export const getOpportunityRecords = createServerFn({ method: 'GET' })
  .validator((input: unknown) => opportunityRecordsInputSchema.parse(input))
  .handler(async ({ data }): Promise<OpportunityRecords> => {
    const { supabase } = await requireUser()
    const [contacts, interviews, notes] = await Promise.all([
      supabase
        .from('contacts')
        .select(contactSelection)
        .eq('opportunity_id', data.opportunityId)
        .order('created_at', { ascending: false }),
      supabase
        .from('interviews')
        .select(interviewSelection)
        .eq('opportunity_id', data.opportunityId)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('notes')
        .select(noteSelection)
        .eq('opportunity_id', data.opportunityId)
        .order('created_at', { ascending: false }),
    ])
    if (contacts.error || interviews.error || notes.error)
      throw new Error(
        'Unable to load opportunity records. Check that the records migration has been applied.',
      )
    const mappedContacts = contacts.data.map(mapContact)
    const contactNames = new Map(
      mappedContacts.map((contact) => [contact.id, contact.name]),
    )
    return {
      contacts: mappedContacts,
      interviews: interviews.data.map((row) => mapInterview(row, contactNames)),
      notes: notes.data.map(mapNote),
    }
  })

export const listUpcomingInterviews = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const interviews = await supabase
      .from('interviews')
      .select(
        'id, opportunity_id, contact_id, interview_type, stage, scheduled_at, duration_minutes, location_or_url',
      )
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20)
    if (interviews.error)
      throw new Error(
        'Unable to load upcoming interviews. Check that the records migration has been applied.',
      )
    if (!interviews.data.length) return []

    const opportunityIds = [
      ...new Set(interviews.data.map((item) => item.opportunity_id)),
    ]
    const contactIds = interviews.data
      .map((item) => item.contact_id)
      .filter((id): id is string => Boolean(id))
    const [opportunities, contacts] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, title, source')
        .in('id', opportunityIds),
      contactIds.length
        ? supabase.from('contacts').select('id, name').in('id', contactIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (opportunities.error || contacts.error)
      throw new Error('Unable to load upcoming interview details.')

    const opportunityById = new Map(
      opportunities.data.map((item) => [item.id, item]),
    )
    const contactById = new Map(
      contacts.data.map((item) => [item.id, item.name]),
    )
    return interviews.data
      .filter(
        (item) =>
          opportunityById.get(item.opportunity_id)?.source !==
          'CareerOS sample',
      )
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        opportunityId: item.opportunity_id,
        interviewType:
          item.interview_type as OpportunityInterview['interviewType'],
        stage: item.stage ?? '',
        scheduledAt: item.scheduled_at,
        durationMinutes: item.duration_minutes,
        locationOrUrl: item.location_or_url ?? '',
        role:
          opportunityById.get(item.opportunity_id)?.title ?? 'Untitled role',
        contactName: item.contact_id
          ? (contactById.get(item.contact_id) ?? null)
          : null,
      }))
  },
)

export const createContact = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createContactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const result = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        opportunity_id: data.opportunityId,
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        profile_url: data.profileUrl || null,
        notes: data.notes || null,
      })
      .select('id')
      .single()
    if (result.error) throw new Error('Unable to save this contact.')
    return { id: result.data.id }
  })

export const updateContact = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateContactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('contacts')
      .update({
        name: data.name,
        role: data.role || null,
        email: data.email || null,
        profile_url: data.profileUrl || null,
        notes: data.notes || null,
      })
      .eq('id', data.contactId)
      .eq('opportunity_id', data.opportunityId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to update this contact.')
    if (!result.data) throw new Error('Contact not found.')
    return { id: result.data.id }
  })

export const createInterview = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createInterviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    await ensureContact(supabase, data.opportunityId, data.contactId)
    const result = await supabase
      .from('interviews')
      .insert({
        user_id: userId,
        opportunity_id: data.opportunityId,
        contact_id: data.contactId,
        interview_type: data.interviewType,
        stage: data.stage || null,
        scheduled_at: data.scheduledAt,
        duration_minutes: data.durationMinutes,
        location_or_url: data.locationOrUrl || null,
        status: data.status,
        outcome: data.outcome,
        preparation_notes: data.preparationNotes || null,
        post_interview_notes: data.postInterviewNotes || null,
        completed_at:
          data.status === 'completed' ? new Date().toISOString() : null,
      })
      .select('id')
      .single()
    if (result.error) throw new Error('Unable to save this interview.')
    return { id: result.data.id }
  })

export const updateInterview = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateInterviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    await ensureContact(supabase, data.opportunityId, data.contactId)
    const existing = await supabase
      .from('interviews')
      .select('completed_at')
      .eq('id', data.interviewId)
      .eq('opportunity_id', data.opportunityId)
      .maybeSingle()
    if (existing.error) throw new Error('Unable to update this interview.')
    if (!existing.data) throw new Error('Interview not found.')
    const result = await supabase
      .from('interviews')
      .update({
        contact_id: data.contactId,
        interview_type: data.interviewType,
        stage: data.stage || null,
        scheduled_at: data.scheduledAt,
        duration_minutes: data.durationMinutes,
        location_or_url: data.locationOrUrl || null,
        status: data.status,
        outcome: data.outcome,
        preparation_notes: data.preparationNotes || null,
        post_interview_notes: data.postInterviewNotes || null,
        completed_at:
          data.status === 'completed'
            ? (existing.data.completed_at ?? new Date().toISOString())
            : null,
      })
      .eq('id', data.interviewId)
      .eq('opportunity_id', data.opportunityId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to update this interview.')
    if (!result.data) throw new Error('Interview not found.')
    return { id: result.data.id }
  })

export const createNote = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createNoteSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const result = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        opportunity_id: data.opportunityId,
        body: data.body,
      })
      .select('id')
      .single()
    if (result.error) throw new Error('Unable to save this note.')
    return { id: result.data.id }
  })

export const updateNote = createServerFn({ method: 'POST' })
  .validator((input: unknown) => updateNoteSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('notes')
      .update({ body: data.body })
      .eq('id', data.noteId)
      .eq('opportunity_id', data.opportunityId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to update this note.')
    if (!result.data) throw new Error('Note not found.')
    return { id: result.data.id }
  })
