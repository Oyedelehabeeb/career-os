import { createHash } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'

import {
  analyzeOpportunitySchema,
  parseJobDescription,
  saveJobAnalysisSchema,
} from '../lib/job-intelligence'
import { createClient } from '../lib/supabase/server'
import type { JobAnalysis } from '../lib/job-intelligence'

const parserVersion = 'rules-v1'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

function sourceHash(text: string) {
  return createHash('sha256').update(text.trim()).digest('hex')
}

function mapAnalysis(
  row: Record<string, unknown>,
  currentHash: string | null,
): JobAnalysis {
  return {
    id: String(row.id),
    sourceHash: String(row.source_hash),
    parserVersion: String(row.parser_version),
    extractionMethod: row.extraction_method as JobAnalysis['extractionMethod'],
    reviewStatus: row.review_status as JobAnalysis['reviewStatus'],
    seniority: row.seniority as JobAnalysis['seniority'],
    experienceMin:
      row.experience_min === null ? null : Number(row.experience_min),
    experienceMax:
      row.experience_max === null ? null : Number(row.experience_max),
    workMode: row.work_mode as JobAnalysis['workMode'],
    location: String(row.location ?? ''),
    salaryMin: row.salary_min === null ? null : Number(row.salary_min),
    salaryMax: row.salary_max === null ? null : Number(row.salary_max),
    salaryCurrency: String(row.salary_currency ?? ''),
    responsibilities: (row.responsibilities ?? []) as string[],
    requiredSkills: (row.required_skills ?? []) as string[],
    preferredSkills: (row.preferred_skills ?? []) as string[],
    educationRequirements: (row.education_requirements ?? []) as string[],
    technologies: (row.technologies ?? []) as string[],
    isStale: currentHash !== null && row.source_hash !== currentHash,
    updatedAt: String(row.updated_at),
  }
}

const selection =
  'id, source_hash, parser_version, extraction_method, review_status, seniority, experience_min, experience_max, work_mode, location, salary_min, salary_max, salary_currency, responsibilities, required_skills, preferred_skills, education_requirements, technologies, updated_at'

export const getJobAnalysis = createServerFn({ method: 'GET' })
  .validator((input: unknown) => analyzeOpportunitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const [analysis, opportunity] = await Promise.all([
      supabase
        .from('job_analyses')
        .select(selection)
        .eq('opportunity_id', data.opportunityId)
        .maybeSingle(),
      supabase
        .from('opportunities')
        .select('job_description')
        .eq('id', data.opportunityId)
        .maybeSingle(),
    ])
    if (analysis.error || opportunity.error)
      throw new Error(
        'Unable to load job intelligence. Check that its migration has been applied.',
      )
    if (!analysis.data) return null
    const currentHash = opportunity.data?.job_description
      ? sourceHash(opportunity.data.job_description)
      : null
    return mapAnalysis(analysis.data, currentHash)
  })

export const analyzeOpportunity = createServerFn({ method: 'POST' })
  .validator((input: unknown) => analyzeOpportunitySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const opportunity = await supabase
      .from('opportunities')
      .select('title, location, work_mode, job_description')
      .eq('id', data.opportunityId)
      .maybeSingle()
    if (opportunity.error || !opportunity.data)
      throw new Error('Opportunity not found.')
    const description = opportunity.data.job_description?.trim()
    if (!description || description.length < 40)
      throw new Error(
        'Add a fuller job description before extracting requirements.',
      )
    const parsed = parseJobDescription({
      text: description,
      title: opportunity.data.title ?? '',
      location: opportunity.data.location ?? '',
      existingWorkMode: opportunity.data.work_mode,
    })
    const hash = sourceHash(description)
    const result = await supabase
      .from('job_analyses')
      .upsert(
        {
          user_id: userId,
          opportunity_id: data.opportunityId,
          source_hash: hash,
          parser_version: parserVersion,
          extraction_method: 'local_rules',
          review_status: 'draft',
          seniority: parsed.seniority,
          experience_min: parsed.experienceMin,
          experience_max: parsed.experienceMax,
          work_mode: parsed.workMode,
          location: parsed.location || null,
          salary_min: parsed.salaryMin,
          salary_max: parsed.salaryMax,
          salary_currency: parsed.salaryCurrency || null,
          responsibilities: parsed.responsibilities,
          required_skills: parsed.requiredSkills,
          preferred_skills: parsed.preferredSkills,
          education_requirements: parsed.educationRequirements,
          technologies: parsed.technologies,
        },
        { onConflict: 'opportunity_id,user_id' },
      )
      .select(selection)
      .single()
    if (result.error) throw new Error('Unable to save extracted requirements.')
    return mapAnalysis(result.data, hash)
  })

export const saveJobAnalysis = createServerFn({ method: 'POST' })
  .validator((input: unknown) => saveJobAnalysisSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const opportunity = await supabase
      .from('opportunities')
      .select('job_description')
      .eq('id', data.opportunityId)
      .maybeSingle()
    if (opportunity.error || !opportunity.data)
      throw new Error('Opportunity not found.')
    const currentHash = opportunity.data.job_description
      ? sourceHash(opportunity.data.job_description)
      : null
    if (!currentHash || currentHash !== data.sourceHash)
      throw new Error(
        'The job description changed. Extract it again before saving your review.',
      )
    const result = await supabase
      .from('job_analyses')
      .update({
        review_status: 'reviewed',
        seniority: data.seniority,
        experience_min: data.experienceMin,
        experience_max: data.experienceMax,
        work_mode: data.workMode,
        location: data.location || null,
        salary_min: data.salaryMin,
        salary_max: data.salaryMax,
        salary_currency: data.salaryCurrency || null,
        responsibilities: data.responsibilities,
        required_skills: data.requiredSkills,
        preferred_skills: data.preferredSkills,
        education_requirements: data.educationRequirements,
        technologies: data.technologies,
      })
      .eq('opportunity_id', data.opportunityId)
      .eq('source_hash', data.sourceHash)
      .select(selection)
      .maybeSingle()
    if (result.error) throw new Error('Unable to save your reviewed analysis.')
    if (!result.data) throw new Error('Job analysis not found.')
    return mapAnalysis(result.data, currentHash)
  })
