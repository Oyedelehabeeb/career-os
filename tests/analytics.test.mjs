import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAnalyticsSnapshot } from '../src/lib/analytics.ts'

const now = new Date('2026-01-10T00:00:00.000Z')

const opportunities = [
  {
    id: 'one',
    status: 'offer',
    source: 'Referral',
    sourceUrl: null,
    resumeVersionId: 'resume-one',
    savedAt: '2026-01-01T00:00:00.000Z',
    appliedAt: '2026-01-02T00:00:00.000Z',
    isSample: false,
  },
  {
    id: 'two',
    status: 'rejected',
    source: null,
    sourceUrl: 'https://www.indeed.com/viewjob?id=2',
    resumeVersionId: 'resume-two',
    savedAt: '2026-01-01T00:00:00.000Z',
    appliedAt: '2026-01-03T00:00:00.000Z',
    isSample: false,
  },
  {
    id: 'sample',
    status: 'offer',
    source: 'CareerOS sample',
    sourceUrl: null,
    resumeVersionId: null,
    savedAt: '2026-01-01T00:00:00.000Z',
    appliedAt: '2026-01-02T00:00:00.000Z',
    isSample: true,
  },
]

const events = [
  ['one', 'saved', '2026-01-01T00:00:00.000Z'],
  ['one', 'applied', '2026-01-02T00:00:00.000Z'],
  ['one', 'screening', '2026-01-04T00:00:00.000Z'],
  ['one', 'interview', '2026-01-06T00:00:00.000Z'],
  ['one', 'final_round', '2026-01-07T00:00:00.000Z'],
  ['one', 'offer', '2026-01-08T00:00:00.000Z'],
  ['two', 'saved', '2026-01-01T00:00:00.000Z'],
  ['two', 'applied', '2026-01-03T00:00:00.000Z'],
  ['two', 'rejected', '2026-01-07T00:00:00.000Z'],
  ['sample', 'saved', '2026-01-01T00:00:00.000Z'],
  ['sample', 'applied', '2026-01-02T00:00:00.000Z'],
  ['sample', 'offer', '2026-01-03T00:00:00.000Z'],
].map(([opportunityId, toStatus, occurredAt]) => ({
  opportunityId,
  toStatus,
  occurredAt,
}))

const snapshot = buildAnalyticsSnapshot(
  {
    opportunities,
    events,
    resumes: [
      { id: 'resume-one', name: 'Product resume', isArchived: false },
      { id: 'resume-two', name: 'General resume', isArchived: true },
    ],
    analyses: [
      {
        opportunityId: 'one',
        requiredSkills: ['React', 'TypeScript'],
        preferredSkills: ['React'],
        technologies: [],
      },
      {
        opportunityId: 'two',
        requiredSkills: ['react'],
        preferredSkills: [],
        technologies: ['Figma'],
      },
      {
        opportunityId: 'sample',
        requiredSkills: ['Sample skill'],
        preferredSkills: [],
        technologies: [],
      },
    ],
  },
  now,
)

test('funnel uses historical reach and excludes sample opportunities', () => {
  assert.deepEqual(
    snapshot.funnel.map((stage) => stage.count),
    [2, 2, 2, 1, 1, 1],
  )
  assert.equal(snapshot.conversions[1].rate, 100)
  assert.equal(snapshot.conversions[2].rate, 50)
})

test('source and resume performance remain transparent about sample size', () => {
  assert.deepEqual(
    snapshot.sourcePerformance.map((source) => source.label).sort(),
    ['Indeed', 'Referral'],
  )
  assert.equal(snapshot.resumePerformance[0].applied, 1)
  assert.ok(
    snapshot.resumePerformance.some(
      (resume) => resume.label === 'General resume (archived)',
    ),
  )
})

test('skill demand counts a skill once per analyzed opportunity', () => {
  assert.equal(snapshot.analyzedOpportunityCount, 2)
  assert.deepEqual(snapshot.skillDemand[0], {
    label: 'React',
    count: 2,
    frequency: 100,
  })
  assert.equal(
    snapshot.skillDemand.find((skill) => skill.label === 'TypeScript')
      .frequency,
    50,
  )
})

test('response and stage timing derive from chronological status events', () => {
  assert.equal(snapshot.responseTiming.averageDays, 3)
  assert.equal(snapshot.responseTiming.sampleSize, 2)
  assert.equal(
    snapshot.timeInStage.find((stage) => stage.status === 'applied')
      .averageDays,
    3,
  )
})

test('does not invent an application step when a workflow skips it', () => {
  const directOutcome = buildAnalyticsSnapshot({
    opportunities: [
      {
        id: 'skipped',
        status: 'rejected',
        source: null,
        sourceUrl: null,
        resumeVersionId: null,
        savedAt: '2026-01-01T00:00:00.000Z',
        appliedAt: null,
        isSample: false,
      },
    ],
    events: [
      {
        opportunityId: 'skipped',
        toStatus: 'saved',
        occurredAt: '2026-01-01T00:00:00.000Z',
      },
      {
        opportunityId: 'skipped',
        toStatus: 'rejected',
        occurredAt: '2026-01-02T00:00:00.000Z',
      },
    ],
    resumes: [],
    analyses: [],
  })
  assert.equal(directOutcome.funnel[1].count, 0)
  assert.equal(directOutcome.funnel[2].count, 0)
})
