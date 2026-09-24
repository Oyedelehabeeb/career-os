import assert from 'node:assert/strict'
import test from 'node:test'

import {
  changeStatusSchema,
  completeFollowUpSchema,
  createFollowUpSchema,
  editOpportunitySchema,
} from '../src/lib/opportunity.ts'

const editable = {
  opportunityId: 'e61017b4-f85c-4702-bc68-120b5e58ccbf',
  companyName: '',
  title: 'Product Designer',
  location: '',
  workMode: 'unspecified',
  sourceUrl: '',
  jobDescription: '',
  priority: 'medium',
}

test('partial opportunity edits remain valid', () => {
  assert.equal(editOpportunitySchema.parse(editable).title, 'Product Designer')
})

test('an edit cannot erase every identifying field', () => {
  assert.equal(
    editOpportunitySchema.safeParse({ ...editable, title: '' }).success,
    false,
  )
})

test('job URLs are limited to HTTP and HTTPS', () => {
  assert.equal(
    editOpportunitySchema.safeParse({
      ...editable,
      sourceUrl: 'javascript:alert(1)',
    }).success,
    false,
  )
  assert.equal(
    editOpportunitySchema.safeParse({
      ...editable,
      sourceUrl: 'https://example.com/job',
    }).success,
    true,
  )
})

test('follow-ups require a real title and timestamp', () => {
  const input = {
    opportunityId: editable.opportunityId,
    title: 'Follow up',
    dueAt: '2026-09-21T09:00:00.000Z',
  }
  assert.equal(createFollowUpSchema.safeParse(input).success, true)
  assert.equal(
    createFollowUpSchema.safeParse({ ...input, title: ' ' }).success,
    false,
  )
  assert.equal(
    createFollowUpSchema.safeParse({ ...input, dueAt: 'tomorrow' }).success,
    false,
  )
})

test('status and completion requests reject unknown identifiers', () => {
  assert.equal(
    changeStatusSchema.safeParse({
      opportunityId: editable.opportunityId,
      status: 'maybe',
    }).success,
    false,
  )
  assert.equal(
    completeFollowUpSchema.safeParse({
      opportunityId: editable.opportunityId,
      followUpId: 'not-a-uuid',
    }).success,
    false,
  )
})
