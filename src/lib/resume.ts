import { z } from 'zod'

export const resumeMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const createResumeVersionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  originalFileName: z.string().trim().min(1).max(255),
  storagePath: z.string().trim().min(1).max(500),
  mimeType: z.enum(resumeMimeTypes),
  fileSize: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  notes: z.string().trim().max(2000),
})

export const resumeIdSchema = z.object({ resumeId: z.uuid() })

export const setResumeArchivedSchema = resumeIdSchema.extend({
  archived: z.boolean(),
})

export const attachResumeSchema = z.object({
  opportunityId: z.uuid(),
  resumeVersionId: z.union([z.uuid(), z.null()]),
})

export type ResumeVersion = {
  id: string
  name: string
  originalFileName: string
  storagePath: string
  mimeType: (typeof resumeMimeTypes)[number]
  fileSize: number
  notes: string | null
  isArchived: boolean
  createdAt: string
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function safeStorageFileName(fileName: string) {
  const extension = fileName.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf'
  return `${crypto.randomUUID()}.${extension}`
}
