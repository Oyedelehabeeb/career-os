import { z } from 'zod'

const optionalUrl = z.union([
  z.url().refine((value) => /^https?:\/\//i.test(value), {
    message: 'Use a full HTTP or HTTPS URL.',
  }),
  z.literal(''),
])

export const workModes = ['remote', 'hybrid', 'on_site'] as const
export const skillCategories = [
  'technical',
  'tool',
  'domain',
  'soft',
  'other',
] as const
export const skillProficiencies = [
  'learning',
  'working',
  'strong',
  'expert',
] as const

export const profileSchema = z
  .object({
    currentRole: z.string().trim().max(200),
    targetRole: z.string().trim().max(200),
    yearsExperience: z.union([z.number().min(0).max(70), z.null()]),
    professionalSummary: z.string().trim().max(3000),
    industries: z.array(z.string().trim().min(1).max(100)).max(20),
    location: z.string().trim().max(200),
    preferredWorkModes: z.array(z.enum(workModes)).max(workModes.length),
    preferredRoleTypes: z.array(z.string().trim().min(1).max(100)).max(20),
    compensationMin: z.union([z.number().min(0), z.null()]),
    compensationMax: z.union([z.number().min(0), z.null()]),
    compensationCurrency: z.union([
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/),
      z.literal(''),
    ]),
    portfolioUrl: optionalUrl,
    githubUrl: optionalUrl,
    linkedinUrl: optionalUrl,
  })
  .refine(
    (value) =>
      value.compensationMin === null ||
      value.compensationMax === null ||
      value.compensationMin <= value.compensationMax,
    {
      message: 'Maximum compensation must be at least the minimum.',
      path: ['compensationMax'],
    },
  )

export const addSkillSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.enum(skillCategories),
  proficiency: z.enum(skillProficiencies),
})

export const removeSkillSchema = z.object({ skillId: z.uuid() })

export type CareerProfile = z.infer<typeof profileSchema>
export type ProfileSkill = {
  id: string
  name: string
  category: (typeof skillCategories)[number]
  proficiency: (typeof skillProficiencies)[number] | null
}

export function profileCompletion(
  profile: CareerProfile | null,
  skillCount: number,
) {
  if (!profile) return 0
  const checks = [
    Boolean(profile.currentRole || profile.targetRole),
    profile.yearsExperience !== null,
    Boolean(profile.professionalSummary),
    skillCount > 0,
    Boolean(profile.location || profile.preferredWorkModes.length),
    Boolean(profile.portfolioUrl || profile.githubUrl || profile.linkedinUrl),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
