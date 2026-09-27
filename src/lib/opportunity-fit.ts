import { z } from 'zod'

const skillEvidenceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  requirement: z.enum(['required', 'preferred']),
  sources: z
    .array(z.enum(['profile', 'resume']))
    .min(1)
    .max(2),
  proficiency: z.union([z.string().trim().max(30), z.null()]),
})

const alignmentSchema = z.object({
  status: z.enum(['aligned', 'gap', 'unclear', 'not_specified']),
  summary: z.string().trim().min(1).max(500),
})

const preparationTopicSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']),
})

export const fitResultSchema = z.object({
  matchedSkills: z.array(skillEvidenceSchema).max(200),
  missingRequiredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
  missingPreferredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
  resumeGaps: z.array(z.string().trim().min(1).max(100)).max(100),
  resumeEvidenceAvailable: z.boolean(),
  experienceAlignment: alignmentSchema,
  seniorityAlignment: alignmentSchema,
  workModeAlignment: alignmentSchema,
  preparationTopics: z.array(preparationTopicSchema).max(10),
})

export const opportunityFitInputSchema = z.object({ opportunityId: z.uuid() })

export type FitResult = z.infer<typeof fitResultSchema>
export type OpportunityFit = FitResult & {
  id: string
  inputHash: string
  evaluatorVersion: string
  isStale: boolean
  updatedAt: string
}

export type FitProfileSkill = {
  name: string
  proficiency: string | null
}

export type FitInputs = {
  requiredSkills: string[]
  preferredSkills: string[]
  requiredExperienceMin: number | null
  requiredExperienceMax: number | null
  requiredSeniority: string | null
  requiredWorkMode: 'remote' | 'hybrid' | 'on_site' | null
  candidateYearsExperience: number | null
  candidateCurrentRole: string
  candidatePreferredWorkModes: Array<'remote' | 'hybrid' | 'on_site'>
  profileSkills: FitProfileSkill[]
  resumeText: string
}

const seniorityOrder = [
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'staff',
  'principal',
  'executive',
] as const

const skillAliases: Record<string, string[]> = {
  javascript: ['javascript', 'js'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'reactjs', 'react.js'],
  nextjs: ['nextjs', 'next.js'],
  vuejs: ['vue', 'vuejs', 'vue.js'],
  nodejs: ['node', 'nodejs', 'node.js'],
  postgres: ['postgres', 'postgresql'],
  restapis: ['rest api', 'rest APIs', 'restful api'],
  googlecloud: ['google cloud', 'gcp'],
  cicd: ['ci/cd', 'continuous integration'],
  csharp: ['c#', 'c sharp', '.net'],
}

function skillKey(value: string) {
  const key = value.toLowerCase().replace(/[^a-z0-9+#]/g, '')
  return (
    Object.entries(skillAliases).find(([, aliases]) =>
      aliases.some(
        (alias) => alias.toLowerCase().replace(/[^a-z0-9+#]/g, '') === key,
      ),
    )?.[0] ?? key
  )
}

function containsTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i').test(text)
}

function resumeContainsSkill(text: string, skill: string) {
  const aliases = skillAliases[skillKey(skill)] ?? [skill]
  return aliases.some((alias) => containsTerm(text, alias))
}

function inferSeniority(title: string) {
  const lower = title.toLowerCase()
  if (/\b(chief|vp|vice president|director|head of)\b/.test(lower))
    return 'executive'
  if (/\bprincipal\b/.test(lower)) return 'principal'
  if (/\bstaff\b/.test(lower)) return 'staff'
  if (/\b(lead|manager)\b/.test(lower)) return 'lead'
  if (/\b(senior|sr\.?)\b/.test(lower)) return 'senior'
  if (/\b(junior|jr\.?)\b/.test(lower)) return 'junior'
  if (/\b(entry[ -]level|graduate|intern)\b/.test(lower)) return 'entry'
  if (/\bmid[ -]level\b/.test(lower)) return 'mid'
  return null
}

function experienceAlignment(
  input: FitInputs,
): FitResult['experienceAlignment'] {
  if (input.requiredExperienceMin === null)
    return {
      status: 'not_specified',
      summary: 'The role does not specify a minimum number of years.',
    }
  if (input.candidateYearsExperience === null)
    return {
      status: 'unclear',
      summary: `The role asks for ${input.requiredExperienceMin}+ years, but your profile does not state your experience length.`,
    }
  if (input.candidateYearsExperience >= input.requiredExperienceMin)
    return {
      status: 'aligned',
      summary: `Your ${input.candidateYearsExperience} years meet the role's ${input.requiredExperienceMin}+ year requirement.`,
    }
  return {
    status: 'gap',
    summary: `Your profile lists ${input.candidateYearsExperience} years; the role asks for at least ${input.requiredExperienceMin}.`,
  }
}

function seniorityAlignment(input: FitInputs): FitResult['seniorityAlignment'] {
  if (!input.requiredSeniority)
    return {
      status: 'not_specified',
      summary: 'The role description does not make its seniority clear.',
    }
  const candidate = inferSeniority(input.candidateCurrentRole)
  if (!candidate)
    return {
      status: 'unclear',
      summary: `The role appears ${input.requiredSeniority}-level, but your profile title does not provide reliable seniority evidence.`,
    }
  const candidateIndex = seniorityOrder.indexOf(candidate)
  const requiredIndex = seniorityOrder.indexOf(
    input.requiredSeniority as (typeof seniorityOrder)[number],
  )
  if (candidateIndex >= requiredIndex)
    return {
      status: 'aligned',
      summary: `Your profile signals ${candidate}-level experience for a ${input.requiredSeniority}-level role.`,
    }
  return {
    status: 'unclear',
    summary: `Your profile signals ${candidate}-level experience while the role appears ${input.requiredSeniority}-level. Review the underlying responsibilities before treating this as a gap.`,
  }
}

function workModeAlignment(input: FitInputs): FitResult['workModeAlignment'] {
  if (!input.requiredWorkMode)
    return {
      status: 'not_specified',
      summary: 'The role does not specify a work mode.',
    }
  if (!input.candidatePreferredWorkModes.length)
    return {
      status: 'unclear',
      summary: `The role is ${input.requiredWorkMode.replace('_', '-')}; your work-mode preferences are not set.`,
    }
  if (input.candidatePreferredWorkModes.includes(input.requiredWorkMode))
    return {
      status: 'aligned',
      summary: `The role's ${input.requiredWorkMode.replace('_', '-')} arrangement matches your preferences.`,
    }
  return {
    status: 'gap',
    summary: `The role is ${input.requiredWorkMode.replace('_', '-')}, which is outside your saved preferences.`,
  }
}

export function analyzeFit(input: FitInputs): FitResult {
  const profileByKey = new Map(
    input.profileSkills.map((skill) => [skillKey(skill.name), skill]),
  )
  const resumeEvidenceAvailable = input.resumeText.trim().length > 0
  const seen = new Set<string>()
  const requirements = [
    ...input.requiredSkills.map((name) => ({
      name,
      requirement: 'required' as const,
    })),
    ...input.preferredSkills.map((name) => ({
      name,
      requirement: 'preferred' as const,
    })),
  ].filter(({ name }) => {
    const key = skillKey(name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const matchedSkills: FitResult['matchedSkills'] = []
  const missingRequiredSkills: string[] = []
  const missingPreferredSkills: string[] = []
  const resumeGaps: string[] = []

  for (const requirement of requirements) {
    const profileSkill = profileByKey.get(skillKey(requirement.name))
    const inResume =
      resumeEvidenceAvailable &&
      resumeContainsSkill(input.resumeText, requirement.name)
    const sources = [
      ...(profileSkill ? (['profile'] as const) : []),
      ...(inResume ? (['resume'] as const) : []),
    ]
    if (sources.length) {
      matchedSkills.push({
        ...requirement,
        sources,
        proficiency: profileSkill?.proficiency ?? null,
      })
      if (profileSkill && resumeEvidenceAvailable && !inResume)
        resumeGaps.push(requirement.name)
    } else if (requirement.requirement === 'required') {
      missingRequiredSkills.push(requirement.name)
    } else missingPreferredSkills.push(requirement.name)
  }

  const preparationTopics: FitResult['preparationTopics'] = [
    ...missingRequiredSkills.map((topic) => ({
      topic,
      reason: resumeEvidenceAvailable
        ? 'Required by the role but not found in your profile or selected resume text.'
        : 'Required by the role but not found in your profile; resume text is not available to check.',
      priority: 'high' as const,
    })),
    ...resumeGaps.map((topic) => ({
      topic: `Show evidence of ${topic}`,
      reason:
        'This skill is in your profile but is not visible in the selected resume text.',
      priority: 'medium' as const,
    })),
    ...missingPreferredSkills.map((topic) => ({
      topic,
      reason: resumeEvidenceAvailable
        ? 'Preferred by the role and not found in your current evidence.'
        : 'Preferred by the role but not found in your profile; resume text is not available to check.',
      priority: 'low' as const,
    })),
  ].slice(0, 10)

  return fitResultSchema.parse({
    matchedSkills,
    missingRequiredSkills,
    missingPreferredSkills,
    resumeGaps,
    resumeEvidenceAvailable,
    experienceAlignment: experienceAlignment(input),
    seniorityAlignment: seniorityAlignment(input),
    workModeAlignment: workModeAlignment(input),
    preparationTopics,
  })
}
