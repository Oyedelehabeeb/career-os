import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildActivePipelineSummary,
  daysSince,
  findStaleOpportunities,
  splitFollowUps,
} from '../src/lib/dashboard.ts'

const now = new Date('2026-10-05T12:00:00.000Z')

function opportunity(id, status, updatedAt, isSample = false) {
  return {
    id,
    companyId: null,
    companyName: null,
    title: id,
    location: null,
    status,
    priority: 'medium',
    savedAt: updatedAt,
    updatedAt,
    isSample,
  }
}

test('follow-ups are split into overdue and upcoming actions', () => {
  const result = splitFollowUps(
    [
      { id: 'late', dueAt: '2026-10-05T11:59:00.000Z' },
      { id: 'next', dueAt: '2026-10-05T12:01:00.000Z' },
    ],
    now,
  )
  assert.deepEqual(
    result.overdue.map((item) => item.id),
    ['late'],
  )
  assert.deepEqual(
    result.upcoming.map((item) => item.id),
    ['next'],
  )
})

test('stale opportunities are active, real, and untouched for 14 days', () => {
  const stale = findStaleOpportunities(
    [
      opportunity('old-applied', 'applied', '2026-09-01T12:00:00.000Z'),
      opportunity('recent', 'screening', '2026-10-01T12:00:00.000Z'),
      opportunity('finished', 'rejected', '2026-09-01T12:00:00.000Z'),
      opportunity('sample', 'saved', '2026-09-01T12:00:00.000Z', true),
    ],
    now,
  )
  assert.deepEqual(
    stale.map((item) => item.id),
    ['old-applied'],
  )
  assert.equal(daysSince(stale[0].updatedAt, now), 34)
})

test('active pipeline summary excludes samples and terminal outcomes', () => {
  const summary = buildActivePipelineSummary([
    opportunity('one', 'saved', now.toISOString()),
    opportunity('two', 'applied', now.toISOString()),
    opportunity('sample', 'applied', now.toISOString(), true),
    opportunity('closed', 'closed', now.toISOString()),
  ])
  assert.equal(summary.find((item) => item.status === 'saved').count, 1)
  assert.equal(summary.find((item) => item.status === 'applied').count, 1)
  assert.equal(
    summary.reduce((total, item) => total + item.count, 0),
    2,
  )
})
