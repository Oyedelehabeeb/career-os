import type { OpportunityStatus } from './opportunity'

export type AnalyticsOpportunity = {
  id: string
  status: OpportunityStatus
  source: string | null
  sourceUrl: string | null
  resumeVersionId: string | null
  savedAt: string
  appliedAt: string | null
  isSample: boolean
}

export type AnalyticsEvent = {
  opportunityId: string
  toStatus: OpportunityStatus
  occurredAt: string
}

export type AnalyticsResume = {
  id: string
  name: string
  isArchived: boolean
}

export type AnalyticsJobAnalysis = {
  opportunityId: string
  requiredSkills: string[]
  preferredSkills: string[]
  technologies: string[]
}

export type AnalyticsInput = {
  opportunities: AnalyticsOpportunity[]
  events: AnalyticsEvent[]
  resumes: AnalyticsResume[]
  analyses: AnalyticsJobAnalysis[]
}

type ReachedStage = {
  saved: boolean
  applied: boolean
  response: boolean
  interview: boolean
  finalRound: boolean
  offer: boolean
}

const responseStatuses = new Set<OpportunityStatus>([
  'screening',
  'interview',
  'final_round',
  'offer',
  'rejected',
])
const interviewStatuses = new Set<OpportunityStatus>(['interview'])
const finalRoundStatuses = new Set<OpportunityStatus>(['final_round'])
const measuredStageStatuses: OpportunityStatus[] = [
  'saved',
  'preparing',
  'applied',
  'screening',
  'interview',
  'final_round',
]
const terminalStatuses = new Set<OpportunityStatus>([
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
  'closed',
])

function ratio(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : null
}

function mean(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null
}

function days(milliseconds: number) {
  return milliseconds / 86_400_000
}

function getSourceLabel(opportunity: AnalyticsOpportunity) {
  const savedSource = opportunity.source?.trim()
  if (savedSource && savedSource !== 'CareerOS sample') return savedSource
  if (!opportunity.sourceUrl) return 'Not recorded'
  try {
    const hostname = new URL(opportunity.sourceUrl).hostname.replace(
      /^www\./,
      '',
    )
    const knownSources: Record<string, string> = {
      'linkedin.com': 'LinkedIn',
      'indeed.com': 'Indeed',
      'glassdoor.com': 'Glassdoor',
      'wellfound.com': 'Wellfound',
      'upwork.com': 'Upwork',
    }
    return knownSources[hostname] ?? hostname
  } catch {
    return 'Not recorded'
  }
}

function reachedStages(
  opportunity: AnalyticsOpportunity,
  events: AnalyticsEvent[],
): ReachedStage {
  const statuses = new Set(events.map((event) => event.toStatus))
  statuses.add(opportunity.status)
  const applied = Boolean(opportunity.appliedAt) || statuses.has('applied')
  return {
    saved: true,
    applied,
    response:
      applied && [...statuses].some((status) => responseStatuses.has(status)),
    interview:
      applied && [...statuses].some((status) => interviewStatuses.has(status)),
    finalRound:
      applied && [...statuses].some((status) => finalRoundStatuses.has(status)),
    offer: applied && statuses.has('offer'),
  }
}

function applicationTime(
  opportunity: AnalyticsOpportunity,
  events: AnalyticsEvent[],
) {
  const appliedEvent = events.find((event) => event.toStatus === 'applied')
  return appliedEvent?.occurredAt ?? opportunity.appliedAt
}

function responseTime(events: AnalyticsEvent[], appliedAt: string | null) {
  if (!appliedAt) return null
  const appliedTime = new Date(appliedAt).getTime()
  return (
    events.find(
      (event) =>
        responseStatuses.has(event.toStatus) &&
        new Date(event.occurredAt).getTime() >= appliedTime,
    )?.occurredAt ?? null
  )
}

function performanceRows(
  opportunities: AnalyticsOpportunity[],
  reachedById: Map<string, ReachedStage>,
  labelFor: (opportunity: AnalyticsOpportunity) => string,
) {
  const groups = new Map<
    string,
    {
      label: string
      saved: number
      applied: number
      responses: number
      interviews: number
      offers: number
    }
  >()
  for (const opportunity of opportunities) {
    const label = labelFor(opportunity)
    const current = groups.get(label) ?? {
      label,
      saved: 0,
      applied: 0,
      responses: 0,
      interviews: 0,
      offers: 0,
    }
    const reached = reachedById.get(opportunity.id)!
    current.saved += 1
    current.applied += Number(reached.applied)
    current.responses += Number(reached.response)
    current.interviews += Number(reached.interview)
    current.offers += Number(reached.offer)
    groups.set(label, current)
  }
  return [...groups.values()]
    .map((row) => ({
      ...row,
      responseRate: ratio(row.responses, row.applied),
      interviewRate: ratio(row.interviews, row.applied),
    }))
    .sort(
      (a, b) =>
        b.applied - a.applied ||
        b.saved - a.saved ||
        a.label.localeCompare(b.label),
    )
}

export function buildAnalyticsSnapshot(
  input: AnalyticsInput,
  now = new Date(),
) {
  const opportunities = input.opportunities.filter((item) => !item.isSample)
  const opportunityIds = new Set(opportunities.map((item) => item.id))
  const eventsByOpportunity = new Map<string, AnalyticsEvent[]>()
  for (const event of input.events) {
    if (!opportunityIds.has(event.opportunityId)) continue
    const events = eventsByOpportunity.get(event.opportunityId) ?? []
    events.push(event)
    eventsByOpportunity.set(event.opportunityId, events)
  }
  for (const events of eventsByOpportunity.values())
    events.sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    )

  const reachedById = new Map(
    opportunities.map((opportunity) => [
      opportunity.id,
      reachedStages(opportunity, eventsByOpportunity.get(opportunity.id) ?? []),
    ]),
  )
  const funnel = [
    { key: 'saved', label: 'Saved', count: opportunities.length },
    {
      key: 'applied',
      label: 'Applied',
      count: opportunities.filter((item) => reachedById.get(item.id)!.applied)
        .length,
    },
    {
      key: 'response',
      label: 'Responses',
      count: opportunities.filter((item) => reachedById.get(item.id)!.response)
        .length,
    },
    {
      key: 'interview',
      label: 'Interviews',
      count: opportunities.filter((item) => reachedById.get(item.id)!.interview)
        .length,
    },
    {
      key: 'finalRound',
      label: 'Final rounds',
      count: opportunities.filter(
        (item) => reachedById.get(item.id)!.finalRound,
      ).length,
    },
    {
      key: 'offer',
      label: 'Offers',
      count: opportunities.filter((item) => reachedById.get(item.id)!.offer)
        .length,
    },
  ] as const
  const conversionPairs: Array<
    [keyof ReachedStage, keyof ReachedStage, string]
  > = [
    ['saved', 'applied', 'Saved → Applied'],
    ['applied', 'response', 'Applied → Responses'],
    ['response', 'interview', 'Responses → Interviews'],
    ['interview', 'finalRound', 'Interviews → Final rounds'],
    ['finalRound', 'offer', 'Final rounds → Offers'],
  ]
  const conversions = conversionPairs.map(([from, to, label]) => {
    const denominator = opportunities.filter(
      (item) => reachedById.get(item.id)![from],
    ).length
    const numerator = opportunities.filter((item) => {
      const reached = reachedById.get(item.id)!
      return reached[from] && reached[to]
    }).length
    return {
      label,
      rate: ratio(numerator, denominator),
      numerator,
      denominator,
    }
  })

  const resumeById = new Map(input.resumes.map((resume) => [resume.id, resume]))
  const appliedOpportunities = opportunities.filter(
    (item) => reachedById.get(item.id)!.applied,
  )
  const sourcePerformance = performanceRows(
    opportunities,
    reachedById,
    getSourceLabel,
  )
  const resumePerformance = performanceRows(
    appliedOpportunities,
    reachedById,
    (opportunity) => {
      if (!opportunity.resumeVersionId) return 'No resume recorded'
      const resume = resumeById.get(opportunity.resumeVersionId)
      return resume
        ? `${resume.name}${resume.isArchived ? ' (archived)' : ''}`
        : 'Deleted resume'
    },
  )

  const analyses = input.analyses.filter((analysis) =>
    opportunityIds.has(analysis.opportunityId),
  )
  const skillCounts = new Map<string, { label: string; count: number }>()
  for (const analysis of analyses) {
    const roleSkills = new Map<string, string>()
    for (const skill of [
      ...analysis.requiredSkills,
      ...analysis.preferredSkills,
      ...analysis.technologies,
    ]) {
      const label = skill.trim()
      const key = label.toLocaleLowerCase()
      if (label && !roleSkills.has(key)) roleSkills.set(key, label)
    }
    for (const [key, label] of roleSkills) {
      const current = skillCounts.get(key) ?? { label, count: 0 }
      current.count += 1
      skillCounts.set(key, current)
    }
  }
  const skillDemand = [...skillCounts.values()]
    .map((skill) => ({
      ...skill,
      frequency: ratio(skill.count, analyses.length) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const stageDurations = new Map<OpportunityStatus, number[]>()
  const responseDurations: number[] = []
  for (const opportunity of opportunities) {
    const events = eventsByOpportunity.get(opportunity.id) ?? []
    const appliedAt = applicationTime(opportunity, events)
    const respondedAt = responseTime(events, appliedAt)
    if (appliedAt && respondedAt) {
      const duration =
        new Date(respondedAt).getTime() - new Date(appliedAt).getTime()
      if (duration >= 0) responseDurations.push(days(duration))
    }
    const totals = new Map<OpportunityStatus, number>()
    events.forEach((event, index) => {
      if (!measuredStageStatuses.includes(event.toStatus)) return
      const start = new Date(event.occurredAt).getTime()
      const next = events[index + 1]
      const end = next
        ? new Date(next.occurredAt).getTime()
        : terminalStatuses.has(opportunity.status)
          ? start
          : now.getTime()
      if (end > start)
        totals.set(
          event.toStatus,
          (totals.get(event.toStatus) ?? 0) + days(end - start),
        )
    })
    for (const [status, duration] of totals) {
      const durations = stageDurations.get(status) ?? []
      durations.push(duration)
      stageDurations.set(status, durations)
    }
  }
  const timeInStage = measuredStageStatuses.map((status) => {
    const durations = stageDurations.get(status) ?? []
    return {
      status,
      averageDays: mean(durations),
      sampleSize: durations.length,
    }
  })

  return {
    opportunityCount: opportunities.length,
    analyzedOpportunityCount: analyses.length,
    funnel,
    conversions,
    sourcePerformance,
    resumePerformance,
    skillDemand,
    timeInStage,
    responseTiming: {
      averageDays: mean(responseDurations),
      sampleSize: responseDurations.length,
    },
  }
}
