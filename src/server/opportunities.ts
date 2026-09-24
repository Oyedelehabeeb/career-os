import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  changeStatusSchema,
  completeFollowUpSchema,
  createFollowUpSchema,
  createOpportunitySchema,
  editOpportunitySchema,
} from '../lib/opportunity'
import { createClient } from '../lib/supabase/server'
import type { OpportunityStatus, OpportunitySummary } from '../lib/opportunity'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

export const listOpportunities = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const opportunitiesResult = await supabase
      .from('opportunities')
      .select(
        'id, company_id, title, location, status, priority, saved_at, source',
      )
      .order('saved_at', { ascending: false })
      .limit(100)

    if (opportunitiesResult.error)
      throw new Error(
        'Unable to load opportunities. Check that the database migration has been applied.',
      )
    const companyIds = opportunitiesResult.data
      .map((item) => item.company_id)
      .filter((id): id is string => id !== null)
    const companiesResult = companyIds.length
      ? await supabase.from('companies').select('id, name').in('id', companyIds)
      : null
    if (companiesResult?.error) throw new Error('Unable to load companies.')

    const companyNames = new Map(
      (companiesResult?.data ?? []).map((company) => [
        company.id,
        company.name,
      ]),
    )
    return opportunitiesResult.data.map((item): OpportunitySummary => ({
      id: item.id,
      companyId: item.company_id,
      companyName: item.company_id
        ? (companyNames.get(item.company_id) ?? null)
        : null,
      title: item.title,
      location: item.location,
      status: item.status as OpportunityStatus,
      priority: item.priority as OpportunitySummary['priority'],
      savedAt: item.saved_at,
      isSample: item.source === 'CareerOS sample',
    }))
  },
)

export const createOpportunity = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createOpportunitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    let companyId: string | null = null

    if (data.companyName) {
      const nameKey = data.companyName.toLowerCase()
      const existing = await supabase
        .from('companies')
        .select('id')
        .eq('name_key', nameKey)
        .maybeSingle()
      if (existing.error) throw new Error('Unable to find the company.')

      if (existing.data) {
        companyId = existing.data.id
      } else {
        const inserted = await supabase
          .from('companies')
          .insert({ user_id: userId, name: data.companyName })
          .select('id')
          .single()
        if (inserted.error) {
          const concurrent = await supabase
            .from('companies')
            .select('id')
            .eq('name_key', nameKey)
            .maybeSingle()
          if (concurrent.error || !concurrent.data)
            throw new Error('Unable to save the company.')
          companyId = concurrent.data.id
        } else {
          companyId = inserted.data.id
        }
      }
    }

    const result = await supabase
      .from('opportunities')
      .insert({
        user_id: userId,
        company_id: companyId,
        title: data.title || null,
        location: data.location || null,
        source_url: data.sourceUrl || null,
        job_description: data.jobDescription || null,
        priority: data.priority,
      })
      .select('id')
      .single()

    if (result.error) throw new Error('Unable to save the opportunity.')
    return { id: result.data.id }
  })

export const changeOpportunityStatus = createServerFn({ method: 'POST' })
  .validator((input: unknown) => changeStatusSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('opportunities')
      .update({ status: data.status })
      .eq('id', data.opportunityId)
      .select('id')
      .maybeSingle()

    if (result.error) throw new Error('Unable to update the status.')
    if (!result.data) throw new Error('Opportunity not found.')
    return { id: result.data.id }
  })

export const updateOpportunity = createServerFn({ method: 'POST' })
  .validator((input: unknown) => editOpportunitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    let companyId: string | null = null
    if (data.companyName) {
      const nameKey = data.companyName.toLowerCase()
      const existing = await supabase
        .from('companies')
        .select('id')
        .eq('name_key', nameKey)
        .maybeSingle()
      if (existing.error) throw new Error('Unable to find the company.')
      if (existing.data) companyId = existing.data.id
      else {
        const inserted = await supabase
          .from('companies')
          .insert({ user_id: userId, name: data.companyName })
          .select('id')
          .single()
        if (inserted.error) {
          const concurrent = await supabase
            .from('companies')
            .select('id')
            .eq('name_key', nameKey)
            .maybeSingle()
          if (concurrent.error || !concurrent.data)
            throw new Error('Unable to save the company.')
          companyId = concurrent.data.id
        } else companyId = inserted.data.id
      }
    }
    const result = await supabase
      .from('opportunities')
      .update({
        company_id: companyId,
        title: data.title || null,
        location: data.location || null,
        work_mode: data.workMode === 'unspecified' ? null : data.workMode,
        source_url: data.sourceUrl || null,
        job_description: data.jobDescription || null,
        priority: data.priority,
      })
      .eq('id', data.opportunityId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to update this opportunity.')
    if (!result.data) throw new Error('Opportunity not found.')
    return { id: result.data.id }
  })

export const createFollowUp = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createFollowUpSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const result = await supabase
      .from('follow_ups')
      .insert({
        user_id: userId,
        opportunity_id: data.opportunityId,
        title: data.title,
        due_at: data.dueAt,
      })
      .select('id')
      .single()
    if (result.error) throw new Error('Unable to schedule this follow-up.')
    return { id: result.data.id }
  })

export const completeFollowUp = createServerFn({ method: 'POST' })
  .validator((input: unknown) => completeFollowUpSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('follow_ups')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', data.followUpId)
      .eq('opportunity_id', data.opportunityId)
      .is('completed_at', null)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to complete this follow-up.')
    if (!result.data)
      throw new Error('Follow-up not found or already completed.')
    return { id: result.data.id }
  })

export const listDueFollowUps = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('follow_ups')
      .select('id, opportunity_id, title, due_at')
      .is('completed_at', null)
      .order('due_at', { ascending: true })
      .limit(100)
    if (result.error) throw new Error('Unable to load follow-ups.')
    if (!result.data.length) return []
    const opportunityIds = [
      ...new Set(result.data.map((item) => item.opportunity_id)),
    ]
    const opportunities = await supabase
      .from('opportunities')
      .select('id, title, source')
      .in('id', opportunityIds)
    if (opportunities.error) throw new Error('Unable to load follow-up roles.')
    const roleById = new Map(opportunities.data.map((item) => [item.id, item]))
    return result.data
      .filter(
        (item) =>
          roleById.get(item.opportunity_id)?.source !== 'CareerOS sample',
      )
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        opportunityId: item.opportunity_id,
        title: item.title,
        dueAt: item.due_at,
        role: roleById.get(item.opportunity_id)?.title ?? 'Untitled role',
      }))
  },
)

export const getOpportunity = createServerFn({ method: 'GET' })
  .validator((input: unknown) =>
    z.object({ opportunityId: z.uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('opportunities')
      .select(
        'id, company_id, title, location, work_mode, status, priority, saved_at, applied_at, source, source_url, job_description',
      )
      .eq('id', data.opportunityId)
      .maybeSingle()

    if (result.error) throw new Error('Unable to load this opportunity.')
    if (!result.data) return null

    const [company, history, followUps] = await Promise.all([
      result.data.company_id
        ? supabase
            .from('companies')
            .select('name')
            .eq('id', result.data.company_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('application_events')
        .select('id, from_status, to_status, occurred_at')
        .eq('opportunity_id', data.opportunityId)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('follow_ups')
        .select('id, title, due_at, completed_at, created_at')
        .eq('opportunity_id', data.opportunityId)
        .order('due_at', { ascending: true }),
    ])
    if (company.error || history.error || followUps.error)
      throw new Error('Unable to load this opportunity history.')

    return {
      id: result.data.id,
      companyName: company.data?.name ?? null,
      title: result.data.title,
      location: result.data.location,
      workMode: result.data.work_mode,
      status: result.data.status as OpportunityStatus,
      priority: result.data.priority as OpportunitySummary['priority'],
      savedAt: result.data.saved_at,
      appliedAt: result.data.applied_at,
      sourceUrl: result.data.source_url,
      jobDescription: result.data.job_description,
      isSample: result.data.source === 'CareerOS sample',
      followUps: followUps.data
        .map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.due_at,
          completedAt: item.completed_at,
          createdAt: item.created_at,
        }))
        .sort(
          (a, b) =>
            Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) ||
            new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
        ),
      history: history.data.map((event) => ({
        id: event.id,
        fromStatus: event.from_status as OpportunityStatus | null,
        toStatus: event.to_status as OpportunityStatus,
        occurredAt: event.occurred_at,
      })),
    }
  })
