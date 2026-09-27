import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeFit, fitResultSchema } from '../src/lib/opportunity-fit.ts'

const base = {
  requiredSkills: ['React', 'TypeScript', 'AWS'],
  preferredSkills: ['GraphQL'],
  requiredExperienceMin: 4,
  requiredExperienceMax: 6,
  requiredSeniority: 'senior',
  requiredWorkMode: 'remote',
  candidateYearsExperience: 5,
  candidateCurrentRole: 'Senior Frontend Engineer',
  candidatePreferredWorkModes: ['remote'],
  profileSkills: [
    { name: 'React', proficiency: 'strong' },
    { name: 'TypeScript', proficiency: 'working' },
  ],
  resumeText: 'Built accessible React products and GraphQL integrations.',
}

test('explains matches, gaps, evidence sources, and resume omissions', () => {
  const result = analyzeFit(base)
  assert.equal(fitResultSchema.safeParse(result).success, true)
  assert.deepEqual(result.missingRequiredSkills, ['AWS'])
  assert.deepEqual(result.missingPreferredSkills, [])
  assert.deepEqual(result.resumeGaps, ['TypeScript'])
  assert.deepEqual(
    result.matchedSkills.find((skill) => skill.name === 'React')?.sources,
    ['profile', 'resume'],
  )
  assert.deepEqual(
    result.matchedSkills.find((skill) => skill.name === 'GraphQL')?.sources,
    ['resume'],
  )
  assert.equal(result.experienceAlignment.status, 'aligned')
  assert.equal(result.seniorityAlignment.status, 'aligned')
  assert.equal(result.workModeAlignment.status, 'aligned')
})

test('does not claim resume coverage when resume text is unavailable', () => {
  const result = analyzeFit({ ...base, resumeText: '' })
  assert.equal(result.resumeEvidenceAvailable, false)
  assert.deepEqual(result.resumeGaps, [])
  assert.deepEqual(
    result.matchedSkills.find((skill) => skill.name === 'React')?.sources,
    ['profile'],
  )
})

test('surfaces experience and work-mode gaps without a synthetic score', () => {
  const result = analyzeFit({
    ...base,
    candidateYearsExperience: 2,
    candidatePreferredWorkModes: ['on_site'],
  })
  assert.equal(result.experienceAlignment.status, 'gap')
  assert.equal(result.workModeAlignment.status, 'gap')
  assert.equal('score' in result, false)
})

test('keeps unknown candidate facts explicitly unclear', () => {
  const result = analyzeFit({
    ...base,
    candidateYearsExperience: null,
    candidateCurrentRole: 'Frontend Engineer',
    candidatePreferredWorkModes: [],
  })
  assert.equal(result.experienceAlignment.status, 'unclear')
  assert.equal(result.seniorityAlignment.status, 'unclear')
  assert.equal(result.workModeAlignment.status, 'unclear')
})
