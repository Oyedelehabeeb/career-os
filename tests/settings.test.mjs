import assert from 'node:assert/strict'
import test from 'node:test'

import {
  accountDeletionConfirmed,
  deleteAccountSchema,
} from '../src/lib/settings.ts'

test('account deletion requires the complete signed-in email', () => {
  assert.equal(
    accountDeletionConfirmed('person@example.com', 'person@example.com'),
    true,
  )
  assert.equal(
    accountDeletionConfirmed('PERSON@example.com', 'person@example.com'),
    true,
  )
  assert.equal(accountDeletionConfirmed('DELETE', 'person@example.com'), false)
  assert.equal(accountDeletionConfirmed('', null), false)
})

test('account deletion confirmation input is bounded', () => {
  assert.equal(
    deleteAccountSchema.safeParse({ confirmation: 'person@example.com' })
      .success,
    true,
  )
  assert.equal(
    deleteAccountSchema.safeParse({ confirmation: 'x'.repeat(321) }).success,
    false,
  )
})
