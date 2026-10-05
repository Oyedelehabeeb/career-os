import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOpportunityTimeline,
  createContactSchema,
  createInterviewSchema,
  createNoteSchema,
} from '../src/lib/opportunity-records.ts'

const opportunityId = 'a01f6f90-4889-4704-9bd5-25a3e12816fa'

test('contact input validates useful partial professional details', () => {
  assert.equal(
    createContactSchema.safeParse({
      opportunityId,
      name: 'Ada Okafor',
      role: 'Recruiter',
      email: 'ada@example.com',
      profileUrl: 'https://www.linkedin.com/in/ada',
      notes: '',
    }).success,
    true,
  )
  assert.equal(
    createContactSchema.safeParse({
      opportunityId,
      name: '',
      role: '',
      email: 'not-an-email',
      profileUrl: 'javascript:alert(1)',
      notes: '',
    }).success,
    false,
  )
})

test('interviews require a real schedule and bounded duration', () => {
  const input = {
    opportunityId,
    contactId: null,
    interviewType: 'technical',
    stage: 'Round two',
    scheduledAt: '2026-10-08T09:00:00.000Z',
    durationMinutes: 60,
    locationOrUrl: 'https://meet.example.com/interview',
    status: 'scheduled',
    outcome: null,
    preparationNotes: 'Review system design examples.',
    postInterviewNotes: '',
  }
  assert.equal(createInterviewSchema.safeParse(input).success, true)
  assert.equal(
    createInterviewSchema.safeParse({ ...input, durationMinutes: 5 }).success,
    false,
  )
  assert.equal(
    createInterviewSchema.safeParse({ ...input, scheduledAt: 'tomorrow' })
      .success,
    false,
  )
})

test('notes reject blank and oversized content', () => {
  assert.equal(
    createNoteSchema.safeParse({ opportunityId, body: 'Call notes.' }).success,
    true,
  )
  assert.equal(
    createNoteSchema.safeParse({ opportunityId, body: '   ' }).success,
    false,
  )
})

test('timeline combines canonical records in reverse chronological order', () => {
  const items = buildOpportunityTimeline({
    history: [
      {
        id: '1',
        fromStatus: 'saved',
        toStatus: 'applied',
        occurredAt: '2026-10-01T08:00:00.000Z',
      },
    ],
    contacts: [
      {
        id: '2',
        name: 'Ada',
        role: 'Recruiter',
        email: '',
        profileUrl: '',
        notes: '',
        createdAt: '2026-10-02T08:00:00.000Z',
        updatedAt: '2026-10-02T08:00:00.000Z',
      },
    ],
    interviews: [],
    notes: [
      {
        id: '3',
        body: 'Prepare the portfolio walkthrough.',
        createdAt: '2026-10-03T08:00:00.000Z',
        updatedAt: '2026-10-03T08:00:00.000Z',
      },
    ],
    followUps: [],
  })
  assert.deepEqual(
    items.map((item) => item.kind),
    ['note', 'contact', 'status'],
  )
})
