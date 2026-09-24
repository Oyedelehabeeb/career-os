import assert from 'node:assert/strict'
import test from 'node:test'

import {
  analysisFieldsSchema,
  parseJobDescription,
} from '../src/lib/job-intelligence.ts'

const description = `
Responsibilities:
- Build accessible product experiences with React and TypeScript.
- Partner with design and product teams.

Requirements:
- 3-5 years of frontend development experience.
- Strong React, TypeScript, JavaScript, Git, and REST API experience.
- Bachelor's degree in Computer Science or equivalent experience.

Nice to have:
- AWS and GraphQL experience.

This is a hybrid role in Lagos with a salary of $120k - $150k.
`

test('extracts a structured, explainable job brief', () => {
  const result = parseJobDescription({
    text: description,
    title: 'Senior Frontend Engineer',
    location: 'Lagos',
  })
  assert.equal(result.seniority, 'senior')
  assert.equal(result.experienceMin, 3)
  assert.equal(result.experienceMax, 5)
  assert.equal(result.workMode, 'hybrid')
  assert.equal(result.location, 'Lagos')
  assert.equal(result.salaryMin, 120_000)
  assert.equal(result.salaryMax, 150_000)
  assert.equal(result.salaryCurrency, 'USD')
  assert.deepEqual(
    [...result.requiredSkills].sort(),
    ['React', 'TypeScript', 'JavaScript', 'Git', 'REST APIs'].sort(),
  )
  assert.deepEqual([...result.preferredSkills].sort(), ['AWS', 'GraphQL'])
  assert.equal(result.responsibilities.length, 2)
  assert.equal(result.educationRequirements.length, 1)
})

test('does not duplicate skills or retain a preferred duplicate', () => {
  const result = parseJobDescription({
    text: `Requirements:\n- React and React.js\nPreferred qualifications:\n- React and AWS`,
  })
  assert.deepEqual(result.requiredSkills, ['React'])
  assert.deepEqual(result.preferredSkills, ['AWS'])
})

test('uses the opportunity work mode when already known', () => {
  const result = parseJobDescription({
    text: 'This remote-friendly role works from our office several days a week.',
    existingWorkMode: 'on_site',
  })
  assert.equal(result.workMode, 'on_site')
})

test('supports incomplete descriptions without inventing data', () => {
  const result = parseJobDescription({ text: 'Join our growing product team.' })
  assert.equal(result.seniority, null)
  assert.equal(result.experienceMin, null)
  assert.equal(result.salaryMin, null)
  assert.deepEqual(result.requiredSkills, [])
})

test('review validation rejects inverted numeric ranges', () => {
  const base = parseJobDescription({ text: description })
  assert.equal(
    analysisFieldsSchema.safeParse({
      ...base,
      experienceMin: 8,
      experienceMax: 3,
    }).success,
    false,
  )
  assert.equal(
    analysisFieldsSchema.safeParse({
      ...base,
      salaryMin: 200_000,
      salaryMax: 100_000,
    }).success,
    false,
  )
})
