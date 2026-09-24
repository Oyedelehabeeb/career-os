import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  Archive,
  ArchiveRestore,
  Download,
  FileText,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

import {
  formatFileSize,
  resumeMimeTypes,
  safeStorageFileName,
} from '../lib/resume'
import { createClient } from '../lib/supabase/client'
import {
  createResumeDownload,
  createResumeVersion,
  deleteResumeVersion,
  setResumeArchived,
} from '../server/resumes'
import type { ResumeVersion } from '../lib/resume'

const maxFileSize = 10 * 1024 * 1024

function allowedFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return lowerName.endsWith('.pdf') || lowerName.endsWith('.docx')
}

function resolvedMimeType(file: File): (typeof resumeMimeTypes)[number] {
  return file.name.toLowerCase().endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf'
}

export function ResumeManager({
  userId,
  resumes,
}: {
  userId: string
  resumes: ResumeVersion[]
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const visible = resumes.filter((resume) => showArchived || !resume.isArchived)

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setError(null)
    if (!file) return setSelectedFile(null)
    if (!allowedFile(file)) {
      event.target.value = ''
      setSelectedFile(null)
      return setError('Choose a PDF or DOCX file.')
    }
    if (file.size > maxFileSize) {
      event.target.value = ''
      setSelectedFile(null)
      return setError('Resume files must be 10 MB or smaller.')
    }
    setSelectedFile(file)
  }

  async function uploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!selectedFile) return setError('Choose a resume file first.')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const path = `${userId}/${safeStorageFileName(selectedFile.name)}`
    const supabase = createClient()
    try {
      const upload = await supabase.storage
        .from('resumes')
        .upload(path, selectedFile, {
          cacheControl: '3600',
          contentType: resolvedMimeType(selectedFile),
          upsert: false,
        })
      if (upload.error) throw new Error('Unable to upload the private file.')
      try {
        await createResumeVersion({
          data: {
            name: String(form.get('name') ?? ''),
            originalFileName: selectedFile.name,
            storagePath: path,
            mimeType: resolvedMimeType(selectedFile),
            fileSize: selectedFile.size,
            notes: String(form.get('notes') ?? ''),
          },
        })
      } catch (cause) {
        await supabase.storage.from('resumes').remove([path])
        throw cause
      }
      event.currentTarget.reset()
      setSelectedFile(null)
      setMessage('Resume version uploaded securely.')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to upload this resume.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function downloadResume(resumeId: string) {
    setActionId(resumeId)
    setError(null)
    try {
      const result = await createResumeDownload({ data: { resumeId } })
      window.location.assign(result.url)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to download this file.',
      )
    } finally {
      setActionId(null)
    }
  }

  async function toggleArchived(resume: ResumeVersion) {
    setActionId(resume.id)
    setError(null)
    try {
      await setResumeArchived({
        data: { resumeId: resume.id, archived: !resume.isArchived },
      })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to update this resume.',
      )
    } finally {
      setActionId(null)
    }
  }

  async function removeResume(resume: ResumeVersion) {
    const confirmed = window.confirm(
      `Delete “${resume.name}” and its private file? This cannot be undone.`,
    )
    if (!confirmed) return
    setActionId(resume.id)
    setError(null)
    try {
      await deleteResumeVersion({ data: { resumeId: resume.id } })
      setMessage('Resume version deleted.')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to delete this resume.',
      )
    } finally {
      setActionId(null)
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-topline">
        <span>DOCUMENT LIBRARY</span>
        <span>
          {resumes.filter((resume) => !resume.isArchived).length} active
        </span>
      </div>
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Resume versions</h1>
          <p className="workspace-page-subtitle">
            Keep the exact document used for every application.
          </p>
        </div>
        <a href="#upload-resume" className="workspace-primary-action">
          <Plus size={17} aria-hidden="true" /> Add version
        </a>
      </div>

      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className={error ? 'profile-notice is-error' : 'profile-notice'}
        >
          {error ?? message}
        </p>
      )}

      <section className="resume-privacy" aria-label="Resume privacy">
        <span aria-hidden="true">
          <ShieldCheck size={21} />
        </span>
        <div>
          <strong>Private by default</strong>
          <p>
            Files are isolated to your account. Downloads use links that expire
            after one minute.
          </p>
        </div>
      </section>

      <div className="resume-layout">
        <section
          className="workspace-panel resume-library"
          aria-labelledby="resume-list-heading"
        >
          <div className="workspace-panel-heading resume-library-heading">
            <div>
              <p className="overview-eyebrow">YOUR LIBRARY</p>
              <h2 id="resume-list-heading">Saved versions</h2>
            </div>
            <label className="resume-archive-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>
          {visible.length ? (
            <ul className="resume-list">
              {visible.map((resume) => (
                <li
                  key={resume.id}
                  className={resume.isArchived ? 'is-archived' : ''}
                >
                  <span className="resume-file-icon" aria-hidden="true">
                    <FileText size={21} strokeWidth={1.6} />
                  </span>
                  <div className="resume-file-main">
                    <div>
                      <strong>{resume.name}</strong>
                      {resume.isArchived && <em>Archived</em>}
                    </div>
                    <p>{resume.originalFileName}</p>
                    <small>
                      {formatFileSize(resume.fileSize)} · Added{' '}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                      }).format(new Date(resume.createdAt))}
                    </small>
                    {resume.notes && <span>{resume.notes}</span>}
                  </div>
                  <div className="resume-actions">
                    <button
                      type="button"
                      onClick={() => void downloadResume(resume.id)}
                      disabled={actionId === resume.id}
                      aria-label={`Download ${resume.name}`}
                      title="Download"
                    >
                      <Download size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleArchived(resume)}
                      disabled={actionId === resume.id}
                      aria-label={`${resume.isArchived ? 'Restore' : 'Archive'} ${resume.name}`}
                      title={resume.isArchived ? 'Restore' : 'Archive'}
                    >
                      {resume.isArchived ? (
                        <ArchiveRestore size={16} aria-hidden="true" />
                      ) : (
                        <Archive size={16} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => void removeResume(resume)}
                      disabled={actionId === resume.id}
                      aria-label={`Delete ${resume.name}`}
                      title="Delete"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="resume-empty">
              <FileText size={27} strokeWidth={1.4} aria-hidden="true" />
              <strong>
                {resumes.length
                  ? 'No active versions'
                  : 'No resume versions yet'}
              </strong>
              <p>
                {resumes.length
                  ? 'Turn on “Show archived” to review older files.'
                  : 'Upload the resume you use most often. You can add specialized versions later.'}
              </p>
            </div>
          )}
        </section>

        <aside id="upload-resume" className="workspace-panel resume-upload">
          <p className="overview-eyebrow">NEW VERSION</p>
          <h2>Upload a resume</h2>
          <p>
            PDF or DOCX, up to 10 MB. Give it a name you will recognize later.
          </p>
          <form onSubmit={uploadResume}>
            <label className="profile-field">
              <span>Version name</span>
              <input
                name="name"
                required
                maxLength={120}
                placeholder="e.g. Frontend resume"
              />
            </label>
            <div className="resume-drop-field">
              <input
                ref={fileInput}
                id="resume-file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={chooseFile}
                required
              />
              <button type="button" onClick={() => fileInput.current?.click()}>
                <UploadCloud size={22} aria-hidden="true" />
                <strong>
                  {selectedFile ? selectedFile.name : 'Choose a file'}
                </strong>
                <small>
                  {selectedFile
                    ? formatFileSize(selectedFile.size)
                    : 'PDF or DOCX · 10 MB maximum'}
                </small>
              </button>
            </div>
            <label className="profile-field">
              <span>
                Notes <small>Optional</small>
              </span>
              <textarea
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="What is this version tailored for?"
              />
            </label>
            <button
              type="submit"
              className="resume-upload-action"
              disabled={busy}
            >
              <UploadCloud size={16} aria-hidden="true" />
              {busy ? 'Uploading securely…' : 'Upload resume'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}
