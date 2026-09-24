import assert from 'node:assert/strict'
import test from 'node:test'

import {
  attachResumeSchema,
  createResumeVersionSchema,
  formatFileSize,
  safeStorageFileName,
} from '../src/lib/resume.ts'

const resume = {
  name: 'Frontend resume',
  originalFileName: 'resume.pdf',
  storagePath: 'a01f6f90-4889-4704-9bd5-25a3e12816fa/resume.pdf',
  mimeType: 'application/pdf',
  fileSize: 250_000,
  notes: '',
}

test('resume metadata accepts private PDF and DOCX files', () => {
  assert.equal(createResumeVersionSchema.safeParse(resume).success, true)
  assert.equal(
    createResumeVersionSchema.safeParse({
      ...resume,
      originalFileName: 'resume.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }).success,
    true,
  )
})

test('resume metadata rejects oversized and unsupported files', () => {
  assert.equal(
    createResumeVersionSchema.safeParse({
      ...resume,
      fileSize: 10 * 1024 * 1024 + 1,
    }).success,
    false,
  )
  assert.equal(
    createResumeVersionSchema.safeParse({ ...resume, mimeType: 'text/plain' })
      .success,
    false,
  )
})

test('opportunity resume association supports attach and detach', () => {
  const opportunityId = 'a01f6f90-4889-4704-9bd5-25a3e12816fa'
  const resumeVersionId = '389dd3c9-876a-419e-992a-b3f6f98c63e8'
  assert.equal(
    attachResumeSchema.safeParse({ opportunityId, resumeVersionId }).success,
    true,
  )
  assert.equal(
    attachResumeSchema.safeParse({ opportunityId, resumeVersionId: null })
      .success,
    true,
  )
})

test('storage names preserve only an allowed extension', () => {
  assert.match(safeStorageFileName('My Resume.DOCX'), /^[a-f0-9-]+\.docx$/)
  assert.match(safeStorageFileName('../../resume.pdf'), /^[a-f0-9-]+\.pdf$/)
})

test('file sizes are presented compactly', () => {
  assert.equal(formatFileSize(500), '500 B')
  assert.equal(formatFileSize(2048), '2 KB')
  assert.equal(formatFileSize(1572864), '1.5 MB')
})
