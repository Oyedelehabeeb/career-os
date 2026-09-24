import { createServerFn } from '@tanstack/react-start'

import {
  attachResumeSchema,
  createResumeVersionSchema,
  resumeIdSchema,
  setResumeArchivedSchema,
} from '../lib/resume'
import { createClient } from '../lib/supabase/server'
import type { ResumeVersion } from '../lib/resume'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return { supabase, userId: data.claims.sub }
}

export const listResumeVersions = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('resume_versions')
      .select(
        'id, name, original_file_name, storage_path, mime_type, file_size, notes, is_archived, created_at',
      )
      .order('is_archived', { ascending: true })
      .order('created_at', { ascending: false })
    if (result.error)
      throw new Error(
        'Unable to load resume versions. Check that the resume migration has been applied.',
      )
    return result.data.map((row): ResumeVersion => ({
      id: row.id,
      name: row.name,
      originalFileName: row.original_file_name,
      storagePath: row.storage_path,
      mimeType: row.mime_type as ResumeVersion['mimeType'],
      fileSize: Number(row.file_size),
      notes: row.notes,
      isArchived: row.is_archived,
      createdAt: row.created_at,
    }))
  },
)

export const createResumeVersion = createServerFn({ method: 'POST' })
  .validator((input: unknown) => createResumeVersionSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase, userId } = await requireUser()
    if (!data.storagePath.startsWith(`${userId}/`))
      throw new Error('Invalid resume storage path.')
    const result = await supabase
      .from('resume_versions')
      .insert({
        user_id: userId,
        name: data.name,
        original_file_name: data.originalFileName,
        storage_path: data.storagePath,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        notes: data.notes || null,
      })
      .select('id')
      .single()
    if (result.error) throw new Error('Unable to save this resume version.')
    return { id: result.data.id }
  })

export const createResumeDownload = createServerFn({ method: 'GET' })
  .validator((input: unknown) => resumeIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const resume = await supabase
      .from('resume_versions')
      .select('storage_path, original_file_name')
      .eq('id', data.resumeId)
      .maybeSingle()
    if (resume.error) throw new Error('Unable to find this resume.')
    if (!resume.data) throw new Error('Resume not found.')
    const signed = await supabase.storage
      .from('resumes')
      .createSignedUrl(resume.data.storage_path, 60, {
        download: resume.data.original_file_name,
      })
    if (signed.error) throw new Error('Unable to create a secure download.')
    return { url: signed.data.signedUrl }
  })

export const setResumeArchived = createServerFn({ method: 'POST' })
  .validator((input: unknown) => setResumeArchivedSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('resume_versions')
      .update({ is_archived: data.archived })
      .eq('id', data.resumeId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to update this resume.')
    if (!result.data) throw new Error('Resume not found.')
    return { id: result.data.id }
  })

export const deleteResumeVersion = createServerFn({ method: 'POST' })
  .validator((input: unknown) => resumeIdSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const resume = await supabase
      .from('resume_versions')
      .select('storage_path')
      .eq('id', data.resumeId)
      .maybeSingle()
    if (resume.error || !resume.data) throw new Error('Resume not found.')

    const file = await supabase.storage
      .from('resumes')
      .remove([resume.data.storage_path])
    if (file.error) throw new Error('Unable to delete the private file.')
    const detached = await supabase
      .from('opportunities')
      .update({ resume_version_id: null })
      .eq('resume_version_id', data.resumeId)
    if (detached.error)
      throw new Error(
        'File deleted, but resume associations could not be cleared.',
      )
    const result = await supabase
      .from('resume_versions')
      .delete()
      .eq('id', data.resumeId)
    if (result.error) throw new Error('Unable to delete the resume record.')
    return { deleted: true }
  })

export const attachResumeToOpportunity = createServerFn({ method: 'POST' })
  .validator((input: unknown) => attachResumeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const result = await supabase
      .from('opportunities')
      .update({ resume_version_id: data.resumeVersionId })
      .eq('id', data.opportunityId)
      .select('id')
      .maybeSingle()
    if (result.error) throw new Error('Unable to attach this resume.')
    if (!result.data) throw new Error('Opportunity not found.')
    return { id: result.data.id }
  })
