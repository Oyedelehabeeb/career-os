import type { OpportunityStatus, OpportunitySummary } from './opportunity'

export const dashboardActiveStatuses = [
  'saved',
  'preparing',
  'applied',
  'screening',
  'interview',
  'final_round',
] as const satisfies readonly OpportunityStatus[]

const activeStatusSet = new Set<OpportunityStatus>(dashboardActiveStatuses)

export function splitFollowUps<T extends { dueAt: string }>(
  followUps: T[],
  now: Date,
) {
  const boundary = now.getTime()
  return {
    overdue: followUps.filter(
      (followUp) => new Date(followUp.dueAt).getTime() < boundary,
    ),
    upcoming: followUps.filter(
      (followUp) => new Date(followUp.dueAt).getTime() >= boundary,
    ),
  }
}

export function findStaleOpportunities(
  opportunities: OpportunitySummary[],
  now: Date,
  staleAfterDays = 14,
) {
  const cutoff = now.getTime() - staleAfterDays * 24 * 60 * 60 * 1000
  return opportunities
    .filter(
      (opportunity) =>
        !opportunity.isSample &&
        activeStatusSet.has(opportunity.status) &&
        new Date(opportunity.updatedAt).getTime() < cutoff,
    )
    .sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    )
}

export function buildActivePipelineSummary(
  opportunities: OpportunitySummary[],
) {
  const realActive = opportunities.filter(
    (opportunity) =>
      !opportunity.isSample && activeStatusSet.has(opportunity.status),
  )
  return dashboardActiveStatuses.map((status) => ({
    status,
    count: realActive.filter((opportunity) => opportunity.status === status)
      .length,
  }))
}

export function daysSince(value: string, now: Date) {
  return Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
    ),
  )
}
