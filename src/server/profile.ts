import { createServerFn } from '@tanstack/react-start'

import {
  addSkillSchema,
  profileSchema,
  removeSkillSchema,
} from '../lib/profile'
import { createClient } from '../lib/supabase/server'
import type { CareerProfile, ProfileSkill } from '../lib/profile'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

export const getCareerProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const [profileResult, skillLinks] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'current_title, target_role, years_experience, professional_summary, industries, location, preferred_work_modes, preferred_role_types, compensation_min, compensation_max, compensation_currency, portfolio_url, github_url, linkedin_url',
        )
        .maybeSingle(),
      supabase
        .from('profile_skills')
        .select('skill_id, proficiency')
        .order('created_at', { ascending: true }),
    ])
    if (profileResult.error || skillLinks.error)
      throw new Error(
        'Unable to load your career profile. Check that the profile migration has been applied.',
      )

    const skillIds = skillLinks.data.map((item) => item.skill_id)
    const skillsResult = skillIds.length
      ? await supabase
          .from('skills')
          .select('id, name, category')
          .in('id', skillIds)
      : null
    if (skillsResult?.error) throw new Error('Unable to load your skills.')
    const skillById = new Map(
      (skillsResult?.data ?? []).map((skill) => [skill.id, skill]),
    )
    const skills = skillLinks.data.flatMap((link): ProfileSkill[] => {
      const skill = skillById.get(link.skill_id)
      return skill
        ? [
            {
              id: skill.id,
              name: skill.name,
              category: skill.category as ProfileSkill['category'],
              proficiency: link.proficiency as ProfileSkill['proficiency'],
            },
          ]
        : []
    })

    const row = profileResult.data
    const profile: CareerProfile | null = row
      ? {
          currentRole: row.current_title ?? '',
          targetRole: row.target_role ?? '',
          yearsExperience:
            row.years_experience === null ? null : Number(row.years_experience),
          professionalSummary: row.professional_summary ?? '',
          industries: row.industries ?? [],
          location: row.location ?? '',
          preferredWorkModes: row.preferred_work_modes ?? [],
          preferredRoleTypes: row.preferred_role_types ?? [],
          compensationMin:
            row.compensation_min === null ? null : Number(row.compensation_min),
          compensationMax:
            row.compensation_max === null ? null : Number(row.compensation_max),
          compensationCurrency: row.compensation_currency ?? '',
          portfolioUrl: row.portfolio_url ?? '',
          githubUrl: row.github_url ?? '',
          linkedinUrl: row.linkedin_url ?? '',
        }
      : null
    return { profile, skills }
  },
)

export const saveCareerProfile = createServerFn({ method: 'POST' })
  .validator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const result = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        current_title: data.currentRole || null,
        target_role: data.targetRole || null,
        years_experience: data.yearsExperience,
        professional_summary: data.professionalSummary || null,
        industries: data.industries,
        location: data.location || null,
        preferred_work_modes: data.preferredWorkModes,
        preferred_role_types: data.preferredRoleTypes,
        compensation_min: data.compensationMin,
        compensation_max: data.compensationMax,
        compensation_currency: data.compensationCurrency || null,
        portfolio_url: data.portfolioUrl || null,
        github_url: data.githubUrl || null,
        linkedin_url: data.linkedinUrl || null,
      },
      { onConflict: 'user_id' },
    )
    if (result.error) throw new Error('Unable to save your career profile.')
    return { saved: true }
  })

export const addProfileSkill = createServerFn({ method: 'POST' })
  .validator((input: unknown) => addSkillSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const profile = await supabase
      .from('profiles')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
    if (profile.error) throw new Error('Unable to prepare your profile.')

    const nameKey = data.name.toLowerCase()
    const existing = await supabase
      .from('skills')
      .select('id')
      .eq('name_key', nameKey)
      .maybeSingle()
    if (existing.error) throw new Error('Unable to find this skill.')
    let skillId = existing.data?.id
    if (!skillId) {
      const inserted = await supabase
        .from('skills')
        .insert({ user_id: userId, name: data.name, category: data.category })
        .select('id')
        .single()
      if (inserted.error) {
        const concurrent = await supabase
          .from('skills')
          .select('id')
          .eq('name_key', nameKey)
          .maybeSingle()
        if (concurrent.error || !concurrent.data)
          throw new Error('Unable to save this skill.')
        skillId = concurrent.data.id
      } else skillId = inserted.data.id
    }

    const link = await supabase
      .from('profile_skills')
      .upsert(
        { user_id: userId, skill_id: skillId, proficiency: data.proficiency },
        { onConflict: 'user_id,skill_id' },
      )
    if (link.error) throw new Error('Unable to add this skill to your profile.')
    return { skillId }
  })

export const removeProfileSkill = createServerFn({ method: 'POST' })
  .validator((input: unknown) => removeSkillSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    const result = await supabase
      .from('profile_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill_id', data.skillId)
    if (result.error) throw new Error('Unable to remove this skill.')
    return { removed: true }
  })
