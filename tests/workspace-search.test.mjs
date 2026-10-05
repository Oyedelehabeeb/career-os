import assert from 'node:assert/strict'
import test from 'node:test'

import {
  searchWorkspaceRecords,
  workspaceSearchSchema,
} from '../src/lib/workspace-search.ts'

const input = {
  opportunities: [
    {
      id: 'opportunity-one',
      title: 'Product Designer',
      companyName: 'Northstar',
      location: 'Remote',
      source: 'Referral',
      status: 'interview',
      updatedAt: '2026-10-05T09:00:00.000Z',
      isSample: false,
    },
  ],
  contacts: [
    {
      id: 'contact-one',
      opportunityId: 'opportunity-one',
      name: 'Ada Recruiter',
      role: 'Talent partner',
      email: 'ada@northstar.example',
      notes: 'Introduced by Tobi after the portfolio review.',
      opportunityTitle: 'Product Designer',
      companyName: 'Northstar',
      updatedAt: '2026-10-05T10:00:00.000Z',
      isSample: false,
    },
  ],
  notes: [
    {
      id: 'note-one',
      opportunityId: 'opportunity-one',
      body: 'Prepare the accessibility case study and mobile prototype.',
      opportunityTitle: 'Product Designer',
      companyName: 'Northstar',
      updatedAt: '2026-10-05T11:00:00.000Z',
      isSample: false,
    },
  ],
}

test('search combines opportunity, contact, and note context', () => {
  const results = searchWorkspaceRecords(input, 'northstar')
  assert.deepEqual(
    results.map((result) => result.kind),
    ['opportunity', 'contact', 'note'],
  )
  assert.ok(
    results.every((result) => result.opportunityId === 'opportunity-one'),
  )
})

test('search finds private detail text and ranks direct names first', () => {
  assert.equal(searchWorkspaceRecords(input, 'accessibility')[0].kind, 'note')
  assert.equal(
    searchWorkspaceRecords(input, 'ada recruiter')[0].kind,
    'contact',
  )
})

test('blank and oversized search input is bounded', () => {
  assert.deepEqual(searchWorkspaceRecords(input, '   '), [])
  assert.equal(
    workspaceSearchSchema.safeParse({ query: 'x'.repeat(101) }).success,
    false,
  )
})
