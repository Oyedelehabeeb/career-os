import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  FileLock2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { accountDeletionConfirmed } from '../lib/settings'
import { createClient } from '../lib/supabase/client'
import { deleteMyAccount } from '../server/settings'

export function PrivacySettings({
  email,
  resumeCount,
}: {
  email: string | null
  resumeCount: number
}) {
  const [confirmation, setConfirmation] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmed = accountDeletionConfirmed(confirmation, email)

  async function removeAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!confirmed || !acknowledged || deleting) return
    const finalConfirmation = window.confirm(
      'Permanently delete your CareerOS account and all private job-search data? This cannot be undone.',
    )
    if (!finalConfirmation) return
    setDeleting(true)
    setError(null)
    try {
      await deleteMyAccount({ data: { confirmation } })
      await createClient().auth.signOut({ scope: 'local' })
      window.location.assign('/login')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to delete your account.',
      )
      setDeleting(false)
    }
  }

  return (
    <main className="workspace-page settings-page">
      <div className="workspace-page-topline">
        <span>SETTINGS & PRIVACY</span>
        <span>Private workspace controls</span>
      </div>
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Your data, on your terms.</h1>
          <p className="workspace-page-subtitle">
            Understand what CareerOS stores, how intelligence works, and how to
            leave.
          </p>
        </div>
      </div>

      <section className="settings-account" aria-labelledby="account-heading">
        <span className="settings-section-icon" aria-hidden="true">
          <ShieldCheck size={21} />
        </span>
        <div>
          <p className="overview-eyebrow">ACCOUNT</p>
          <h2 id="account-heading">Signed in securely</h2>
          <p>
            Your workspace is isolated with Supabase authentication and
            row-level security.
          </p>
        </div>
        <strong>{email}</strong>
      </section>

      <div className="settings-grid">
        <section
          className="settings-card"
          aria-labelledby="resume-privacy-heading"
        >
          <div className="settings-card-heading">
            <span aria-hidden="true">
              <FileLock2 size={20} />
            </span>
            <div>
              <p className="overview-eyebrow">PRIVATE FILES</p>
              <h2 id="resume-privacy-heading">Resume deletion assurance</h2>
            </div>
          </div>
          <p>
            Your {resumeCount} resume file{resumeCount === 1 ? '' : 's'}{' '}
            {resumeCount === 1 ? 'is' : 'are'} stored in a private bucket and
            never exposed through a public URL.
          </p>
          <ul className="settings-assurances">
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> Deletion removes the
              Storage object first.
            </li>
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> Database metadata is
              removed only after the file succeeds.
            </li>
            <li>
              <CheckCircle2 size={15} aria-hidden="true" /> A failed file
              deletion stops and shows an error.
            </li>
          </ul>
          <Link to="/resumes" className="settings-link">
            Manage resume files <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </section>

        <section
          className="settings-card"
          aria-labelledby="ai-processing-heading"
        >
          <div className="settings-card-heading">
            <span aria-hidden="true">
              <Bot size={20} />
            </span>
            <div>
              <p className="overview-eyebrow">AI PROCESSING</p>
              <h2 id="ai-processing-heading">No external model configured</h2>
            </div>
          </div>
          <p>
            CareerOS currently extracts job requirements with application-owned,
            rules-based logic. Job descriptions and resume text are not sent to
            an external AI provider.
          </p>
          <div className="settings-status">
            <span aria-hidden="true" /> External AI processing is off
          </div>
          <p className="settings-fine-print">
            Before an external provider is enabled, CareerOS will identify the
            provider, explain what content is sent and why, and minimize
            personal information.
          </p>
        </section>

        <section
          className="settings-card settings-data-card"
          aria-labelledby="stored-data-heading"
        >
          <div className="settings-card-heading">
            <span aria-hidden="true">
              <Database size={20} />
            </span>
            <div>
              <p className="overview-eyebrow">YOUR DATA</p>
              <h2 id="stored-data-heading">What account deletion covers</h2>
            </div>
          </div>
          <p>
            Opportunities, companies, status history, contacts, interviews,
            notes, follow-ups, career profile, skills, job analyses, resume
            records, and private resume files are included.
          </p>
        </section>
      </div>

      <section
        className="settings-danger"
        aria-labelledby="delete-account-heading"
      >
        <div className="settings-danger-heading">
          <span aria-hidden="true">
            <Trash2 size={20} />
          </span>
          <div>
            <p className="overview-eyebrow">DANGER ZONE</p>
            <h2 id="delete-account-heading">Delete your account</h2>
            <p>
              This permanently removes the account and all CareerOS data. It
              cannot be undone.
            </p>
          </div>
        </div>
        <form onSubmit={removeAccount} className="settings-delete-form">
          <label htmlFor="delete-confirmation">
            Type <strong>{email}</strong> to confirm
          </label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <label className="settings-delete-check">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            I understand that this deletion is permanent.
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            disabled={!confirmed || !acknowledged || deleting}
          >
            <Trash2 size={15} aria-hidden="true" />
            {deleting ? 'Deleting account…' : 'Permanently delete account'}
          </button>
        </form>
      </section>
    </main>
  )
}
