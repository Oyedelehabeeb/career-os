import { z } from 'zod'

export const seniorityLevels = [
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'staff',
  'principal',
  'executive',
] as const

export const analysisFieldsSchema = z
  .object({
    seniority: z.union([z.enum(seniorityLevels), z.null()]),
    experienceMin: z.union([z.number().min(0).max(70), z.null()]),
    experienceMax: z.union([z.number().min(0).max(70), z.null()]),
    workMode: z.union([z.enum(['remote', 'hybrid', 'on_site']), z.null()]),
    location: z.string().trim().max(200),
    salaryMin: z.union([z.number().min(0), z.null()]),
    salaryMax: z.union([z.number().min(0), z.null()]),
    salaryCurrency: z.union([
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/),
      z.literal(''),
    ]),
    responsibilities: z.array(z.string().trim().min(1).max(500)).max(80),
    requiredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
    preferredSkills: z.array(z.string().trim().min(1).max(100)).max(100),
    educationRequirements: z.array(z.string().trim().min(1).max(500)).max(30),
    technologies: z.array(z.string().trim().min(1).max(100)).max(100),
  })
  .refine(
    (value) =>
      value.experienceMin === null ||
      value.experienceMax === null ||
      value.experienceMin <= value.experienceMax,
    { path: ['experienceMax'], message: 'Maximum experience is too low.' },
  )
  .refine(
    (value) =>
      value.salaryMin === null ||
      value.salaryMax === null ||
      value.salaryMin <= value.salaryMax,
    { path: ['salaryMax'], message: 'Maximum salary is too low.' },
  )

export const saveJobAnalysisSchema = analysisFieldsSchema.extend({
  opportunityId: z.uuid(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
})

export const analyzeOpportunitySchema = z.object({ opportunityId: z.uuid() })

export type AnalysisFields = z.infer<typeof analysisFieldsSchema>
export type JobAnalysis = AnalysisFields & {
  id: string
  sourceHash: string
  parserVersion: string
  extractionMethod: 'local_rules' | 'ai_assisted'
  reviewStatus: 'draft' | 'reviewed'
  isStale: boolean
  updatedAt: string
}

type Section = 'general' | 'responsibilities' | 'required' | 'preferred'

const skillCatalog = [
  ['JavaScript', ['javascript']],
  ['TypeScript', ['typescript']],
  ['React', ['react', 'react.js', 'reactjs']],
  ['Next.js', ['next.js', 'nextjs']],
  ['Vue.js', ['vue', 'vue.js']],
  ['Angular', ['angular']],
  ['Node.js', ['node.js', 'nodejs']],
  ['Python', ['python']],
  ['Java', ['java']],
  ['C#', ['c#', '.net']],
  ['C++', ['c++']],
  ['Go', ['golang']],
  ['Ruby', ['ruby']],
  ['PHP', ['php']],
  ['Swift', ['swift']],
  ['Kotlin', ['kotlin']],
  ['SQL', ['sql']],
  ['PostgreSQL', ['postgresql', 'postgres']],
  ['MySQL', ['mysql']],
  ['MongoDB', ['mongodb']],
  ['Redis', ['redis']],
  ['GraphQL', ['graphql']],
  ['REST APIs', ['rest api', 'restful api', 'rest apis']],
  ['AWS', ['aws', 'amazon web services']],
  ['Azure', ['azure']],
  ['Google Cloud', ['google cloud', 'gcp']],
  ['Docker', ['docker']],
  ['Kubernetes', ['kubernetes', 'k8s']],
  ['Terraform', ['terraform']],
  ['Git', ['git']],
  ['CI/CD', ['ci/cd', 'continuous integration']],
  ['Figma', ['figma']],
  ['Product design', ['product design']],
  ['UX research', ['ux research', 'user research']],
  ['Data analysis', ['data analysis', 'data analytics']],
  ['Machine learning', ['machine learning', 'ml']],
  ['Communication', ['communication skills', 'written communication']],
  ['Leadership', ['leadership']],
  ['Project management', ['project management']],
] as const

function normalizeList(values: string[]) {
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const clean = value.replace(/^[-•*\d.)\s]+/, '').trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key)) return []
    seen.add(key)
    return [clean]
  })
}

function hasTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i').test(text)
}

function headingSection(line: string): Section | null {
  const clean = line.toLowerCase().replace(/[:\s]+$/, '')
  if (
    /^(responsibilities|what you.ll do|the role|your impact|duties)$/.test(
      clean,
    )
  )
    return 'responsibilities'
  if (
    /^(requirements|required qualifications|qualifications|what you bring|must have)$/.test(
      clean,
    )
  )
    return 'required'
  if (
    /^(preferred qualifications|preferred|nice to have|bonus points)$/.test(
      clean,
    )
  )
    return 'preferred'
  return null
}

function extractExperience(text: string) {
  const matches = [
    ...text.matchAll(
      /(?:at least\s+)?(\d+(?:\.\d+)?)\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s+years?/gi,
    ),
  ]
  if (!matches.length) return { min: null, max: null }
  const ranges = matches.map((match) => ({
    min: Number(match[1]),
    max: match[2] ? Number(match[2]) : null,
  }))
  return ranges.sort((a, b) => b.min - a.min)[0]
}

function parseMoney(value: string) {
  const normalized = value.replace(/,/g, '').toLowerCase()
  const amount = Number.parseFloat(normalized)
  return normalized.endsWith('k') ? amount * 1000 : amount
}

function extractSalary(text: string) {
  const candidates = [
    ...text.matchAll(
      /(?:(USD|GBP|EUR|CAD|AUD|NGN)\s*)?[$£€₦]?\s*(\d[\d,]*(?:\.\d+)?k?)\s*(?:-|–|to)\s*(?:(USD|GBP|EUR|CAD|AUD|NGN)\s*)?[$£€₦]?\s*(\d[\d,]*(?:\.\d+)?k?)/gi,
    ),
  ]
  const match = candidates.find((candidate) =>
    /(?:USD|GBP|EUR|CAD|AUD|NGN|[$£€₦]|\d+k|\d{1,3},\d{3})/i.test(candidate[0]),
  )
  if (!match) return { min: null, max: null, currency: '' }
  const symbol = match[0].match(/[$£€₦]/)?.[0]
  const currencyCode = match[1] || match[3]
  const currency = currencyCode
    ? currencyCode.toUpperCase()
    : ({ $: 'USD', '£': 'GBP', '€': 'EUR', '₦': 'NGN' }[symbol ?? ''] ?? '')
  return {
    min: parseMoney(match[2]),
    max: parseMoney(match[4]),
    currency,
  }
}

export function parseJobDescription({
  text,
  title = '',
  location = '',
  existingWorkMode = null,
}: {
  text: string
  title?: string
  location?: string
  existingWorkMode?: 'remote' | 'hybrid' | 'on_site' | null
}): AnalysisFields {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  let section: Section = 'general'
  const responsibilities: string[] = []
  const education: string[] = []
  const requiredSkills: string[] = []
  const preferredSkills: string[] = []
  const technologies: string[] = []

  for (const line of lines) {
    const nextSection = headingSection(line)
    if (nextSection) {
      section = nextSection
      continue
    }
    const clean = line.replace(/^[-•*\d.)\s]+/, '').trim()
    if (section === 'responsibilities' && clean.length <= 500)
      responsibilities.push(clean)
    if (/\b(degree|bachelor|master|phd|education)\b/i.test(clean))
      education.push(clean)

    const preferred =
      section === 'preferred' ||
      /\b(preferred|nice to have|bonus|a plus)\b/i.test(clean)
    for (const [canonical, aliases] of skillCatalog) {
      if (!aliases.some((alias) => hasTerm(clean, alias))) continue
      technologies.push(canonical)
      ;(preferred ? preferredSkills : requiredSkills).push(canonical)
    }
  }

  const combined = `${title}\n${text}`
  const lower = combined.toLowerCase()
  const seniority = /\b(chief|vp|vice president|director)\b/.test(lower)
    ? 'executive'
    : /\bprincipal\b/.test(lower)
      ? 'principal'
      : /\bstaff\b/.test(lower)
        ? 'staff'
        : /\b(lead|manager)\b/.test(lower)
          ? 'lead'
          : /\bsenior|\bsr\.?\b/.test(lower)
            ? 'senior'
            : /\bjunior|\bjr\.?\b/.test(lower)
              ? 'junior'
              : /\b(entry[ -]level|graduate|intern)\b/.test(lower)
                ? 'entry'
                : /\bmid[ -]level\b/.test(lower)
                  ? 'mid'
                  : null
  const experience = extractExperience(text)
  const salary = extractSalary(text)
  const workMode =
    existingWorkMode ??
    (/\bhybrid\b/i.test(text)
      ? 'hybrid'
      : /\b(remote|work from home|distributed)\b/i.test(text)
        ? 'remote'
        : /\b(on[ -]site|in[ -]office)\b/i.test(text)
          ? 'on_site'
          : null)

  return analysisFieldsSchema.parse({
    seniority,
    experienceMin: experience.min,
    experienceMax: experience.max,
    workMode,
    location,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    responsibilities: normalizeList(responsibilities),
    requiredSkills: normalizeList(requiredSkills),
    preferredSkills: normalizeList(preferredSkills).filter(
      (skill) =>
        !requiredSkills.some(
          (required) => required.toLowerCase() === skill.toLowerCase(),
        ),
    ),
    educationRequirements: normalizeList(education),
    technologies: normalizeList(technologies),
  })
}
