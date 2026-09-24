import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addSkillSchema,
  profileCompletion,
  profileSchema,
} from '../src/lib/profile.ts'

const blankProfile = {
  currentRole: '',
  targetRole: '',
  yearsExperience: null,
  professionalSummary: '',
  industries: [],
  location: '',
  preferredWorkModes: [],
  preferredRoleTypes: [],
  compensationMin: null,
  compensationMax: null,
  compensationCurrency: '',
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
}

test('a partial or blank career profile remains valid', () => {
  assert.equal(profileSchema.safeParse(blankProfile).success, true)
  assert.equal(
    profileSchema.safeParse({ ...blankProfile, targetRole: 'Product designer' })
      .success,
    true,
  )
})

test('compensation range cannot be inverted', () => {
  assert.equal(
    profileSchema.safeParse({
      ...blankProfile,
      compensationMin: 120_000,
      compensationMax: 90_000,
      compensationCurrency: 'USD',
    }).success,
    false,
  )
})

test('professional links are limited to HTTP and HTTPS', () => {
  assert.equal(
    profileSchema.safeParse({
      ...blankProfile,
      portfolioUrl: 'javascript:alert(1)',
    }).success,
    false,
  )
})

test('skill input requires a supported category and proficiency', () => {
  assert.equal(
    addSkillSchema.safeParse({
      name: 'TypeScript',
      category: 'technical',
      proficiency: 'strong',
    }).success,
    true,
  )
  assert.equal(
    addSkillSchema.safeParse({
      name: 'TypeScript',
      category: 'magic',
      proficiency: 'strong',
    }).success,
    false,
  )
})

test('profile completion is based on six meaningful foundations', () => {
  assert.equal(profileCompletion(null, 0), 0)
  assert.equal(
    profileCompletion(
      {
        ...blankProfile,
        targetRole: 'Product designer',
        yearsExperience: 5,
        professionalSummary: 'I design complex workflow products.',
        preferredWorkModes: ['remote'],
        portfolioUrl: 'https://example.com',
      },
      3,
    ),
    100,
  )
})
