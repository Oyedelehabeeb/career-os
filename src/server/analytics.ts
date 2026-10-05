import { createServerFn } from '@tanstack/react-start'

import { buildAnalyticsSnapshot } from '../lib/analytics'
import { createClient } from '../lib/supabase/server'
import type {
  AnalyticsEvent,
  AnalyticsJobAnalysis,
  AnalyticsOpportunity,
  AnalyticsResume,
} from '../lib/analytics'
import type { OpportunityStatus } from '../lib/opportunity'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return supabase
}

export const getAnalyticsSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = await requireUser()
    const [opportunities, events, resumes, analyses] = await Promise.all([
      supabase
        .from('opportunities')
        .select(
          'id, status, source, source_url, resume_version_id, saved_at, applied_at',
        )
        .order('saved_at', { ascending: true })
        .limit(1000),
      supabase
        .from('application_events')
        .select('opportunity_id, to_status, occurred_at')
        .order('occurred_at', { ascending: true })
        .limit(10000),
      supabase
        .from('resume_versions')
        .select('id, name, is_archived')
        .limit(500),
      supabase
        .from('job_analyses')
        .select(
          'opportunity_id, required_skills, preferred_skills, technologies',
        )
        .limit(1000),
    ])
    if (opportunities.error || events.error || resumes.error || analyses.error)
      throw new Error('Unable to calculate your job-search analytics.')

    return buildAnalyticsSnapshot({
      opportunities: opportunities.data.map((item): AnalyticsOpportunity => ({
        id: item.id,
        status: item.status as OpportunityStatus,
        source: item.source,
        sourceUrl: item.source_url,
        resumeVersionId: item.resume_version_id,
        savedAt: item.saved_at,
        appliedAt: item.applied_at,
        isSample: item.source === 'CareerOS sample',
      })),
      events: events.data.map((item): AnalyticsEvent => ({
        opportunityId: item.opportunity_id,
        toStatus: item.to_status as OpportunityStatus,
        occurredAt: item.occurred_at,
      })),
      resumes: resumes.data.map((item): AnalyticsResume => ({
        id: item.id,
        name: item.name,
        isArchived: item.is_archived,
      })),
      analyses: analyses.data.map((item): AnalyticsJobAnalysis => ({
        opportunityId: item.opportunity_id,
        requiredSkills: item.required_skills ?? [],
        preferredSkills: item.preferred_skills ?? [],
        technologies: item.technologies ?? [],
      })),
    })
  },
)
