import { createHash } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'

import {
  analyzeFit,
  fitResultSchema,
  opportunityFitInputSchema,
} from '../lib/opportunity-fit'
import { createClient } from '../lib/supabase/server'
import type { FitInputs, OpportunityFit } from '../lib/opportunity-fit'

const evaluatorVersion = 'explainable-rules-v1'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function loadFitInputs(
  supabase: ReturnType<typeof createClient>,
  opportunityId: string,
) {
  const [opportunityResult, analysisResult, profileResult, skillLinksResult] =
    await Promise.all([
      supabase
        .from('opportunities')
        .select('id, job_description, resume_version_id')
        .eq('id', opportunityId)
        .maybeSingle(),
      supabase
        .from('job_analyses')
        .select(
          'id, source_hash, review_status, required_skills, preferred_skills, experience_min, experience_max, seniority, work_mode',
        )
        .eq('opportunity_id', opportunityId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('current_title, years_experience, preferred_work_modes')
        .maybeSingle(),
      supabase
        .from('profile_skills')
        .select('skill_id, proficiency')
        .order('created_at', { ascending: true }),
    ])

  if (opportunityResult.error || !opportunityResult.data)
    throw new Error('Opportunity not found.')
  if (analysisResult.error || profileResult.error || skillLinksResult.error)
    throw new Error('Unable to load the inputs for fit analysis.')

  const skillIds = skillLinksResult.data.map((link) => link.skill_id)
  const skillsResult = skillIds.length
    ? await supabase.from('skills').select('id, name').in('id', skillIds)
    : null
  if (skillsResult?.error)
    throw new Error('Unable to load your profile skills.')
  const skillNames = new Map(
    (skillsResult?.data ?? []).map((skill) => [skill.id, skill.name]),
  )
  const profileSkills = skillLinksResult.data.flatMap((link) => {
    const name = skillNames.get(link.skill_id)
    return name ? [{ name, proficiency: link.proficiency ?? null }] : []
  })

  const resumeId = opportunityResult.data.resume_version_id
  const resumeResult = resumeId
    ? await supabase
        .from('resume_versions')
        .select('id, name, extracted_text')
        .eq('id', resumeId)
        .maybeSingle()
    : null
  if (resumeResult?.error)
    throw new Error('Unable to load the selected resume.')

  const analysis = analysisResult.data
  const profile = profileResult.data
  const inputs: FitInputs | null = analysis
    ? {
        requiredSkills: analysis.required_skills ?? [],
        preferredSkills: analysis.preferred_skills ?? [],
        requiredExperienceMin:
          analysis.experience_min === null
            ? null
            : Number(analysis.experience_min),
        requiredExperienceMax:
          analysis.experience_max === null
            ? null
            : Number(analysis.experience_max),
        requiredSeniority: analysis.seniority,
        requiredWorkMode: analysis.work_mode,
        candidateYearsExperience:
          profile?.years_experience === null ||
          profile?.years_experience === undefined
            ? null
            : Number(profile.years_experience),
        candidateCurrentRole: profile?.current_title ?? '',
        candidatePreferredWorkModes: profile?.preferred_work_modes ?? [],
        profileSkills,
        resumeText: resumeResult?.data?.extracted_text ?? '',
      }
    : null

  const hashPayload = inputs
    ? {
        evaluatorVersion,
        analysis: {
          id: analysis?.id,
          sourceHash: analysis?.source_hash,
          reviewStatus: analysis?.review_status,
          ...inputs,
          profileSkills: [...profileSkills].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
          resumeText: inputs.resumeText.trim(),
          resumeId: resumeResult?.data?.id ?? null,
        },
      }
    : null

  return {
    analysis,
    opportunity: opportunityResult.data,
    profile,
    resume: resumeResult?.data ?? null,
    inputs,
    inputHash: hashPayload ? sha256(JSON.stringify(hashPayload)) : null,
  }
}

function mapFit(
  row: Record<string, unknown>,
  currentHash: string | null,
): OpportunityFit {
  const result = fitResultSchema.parse(row.result)
  return {
    id: String(row.id),
    inputHash: String(row.input_hash),
    evaluatorVersion: String(row.evaluator_version),
    isStale: currentHash === null || currentHash !== row.input_hash,
    updatedAt: String(row.updated_at),
    ...result,
  }
}

const selection = 'id, input_hash, evaluator_version, result, updated_at'

export const getOpportunityFit = createServerFn({ method: 'GET' })
  .validator((input: unknown) => opportunityFitInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const [fit, current] = await Promise.all([
      supabase
        .from('opportunity_fit_analyses')
        .select(selection)
        .eq('opportunity_id', data.opportunityId)
        .maybeSingle(),
      loadFitInputs(supabase, data.opportunityId),
    ])
    if (fit.error)
      throw new Error(
        'Unable to load fit analysis. Check that its migration has been applied.',
      )
    if (!fit.data) return null
    return mapFit(fit.data, current.inputHash)
  })

export const runOpportunityFit = createServerFn({ method: 'POST' })
  .validator((input: unknown) => opportunityFitInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const current = await loadFitInputs(supabase, data.opportunityId)
    if (!current.analysis || !current.inputs || !current.inputHash)
      throw new Error('Extract and review the job description first.')
    if (current.analysis.review_status !== 'reviewed')
      throw new Error(
        'Review the extracted job requirements before comparing fit.',
      )
    const descriptionHash = current.opportunity.job_description?.trim()
      ? sha256(current.opportunity.job_description.trim())
      : null
    if (!descriptionHash || descriptionHash !== current.analysis.source_hash)
      throw new Error(
        'The job description changed. Extract and review it again.',
      )
    if (
      !current.inputs.profileSkills.length &&
      !current.inputs.resumeText.trim() &&
      current.inputs.candidateYearsExperience === null
    )
      throw new Error(
        'Add profile skills, experience, or searchable resume text before comparing fit.',
      )

    const result = analyzeFit(current.inputs)
    const saved = await supabase
      .from('opportunity_fit_analyses')
      .upsert(
        {
          user_id: userId,
          opportunity_id: data.opportunityId,
          input_hash: current.inputHash,
          evaluator_version: evaluatorVersion,
          result,
        },
        { onConflict: 'opportunity_id,user_id' },
      )
      .select(selection)
      .single()
    if (saved.error) throw new Error('Unable to save the fit analysis.')
    return mapFit(saved.data, current.inputHash)
  })
