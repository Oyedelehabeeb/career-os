import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { opportunityStatuses, statusLabels } from '../lib/opportunity'
import { getCurrentUser } from '../server/auth'
import {
  changeOpportunityStatus,
  completeFollowUp,
  createFollowUp,
  getOpportunity,
  updateOpportunity,
} from '../server/opportunities'
import {
  attachResumeToOpportunity,
  listResumeVersions,
} from '../server/resumes'
import type { OpportunityStatus } from '../lib/opportunity'

export const Route = createFileRoute('/opportunities_/$opportunityId')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: async ({ params }) => {
    const [opportunity, resumes] = await Promise.all([
      getOpportunity({ data: { opportunityId: params.opportunityId } }),
      listResumeVersions(),
    ])
    return { opportunity, resumes }
  },
  component: OpportunityPage,
})

function OpportunityPage() {
  const { user } = Route.useRouteContext()
  const { opportunity, resumes } = Route.useLoaderData()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [followUpBusy, setFollowUpBusy] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [resumeBusy, setResumeBusy] = useState(false)

  if (!opportunity)
    return (
      <AppShell email={user.email}>
        <main className="mx-auto max-w-5xl px-5 py-16">
          <h1 className="text-2xl font-semibold">Opportunity not found</h1>
          <Link to="/opportunities" className="mt-4 inline-block text-sm">
            Back to opportunities
          </Link>
        </main>
      </AppShell>
    )

  async function updateStatus(status: OpportunityStatus) {
    setError(null)
    try {
      await changeOpportunityStatus({
        data: { opportunityId: opportunity!.id, status },
      })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update the status.',
      )
    }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      await updateOpportunity({
        data: {
          opportunityId: opportunity!.id,
          companyName: String(form.get('companyName') ?? ''),
          title: String(form.get('title') ?? ''),
          location: String(form.get('location') ?? ''),
          workMode: String(form.get('workMode') ?? 'unspecified') as
            'remote' | 'hybrid' | 'on_site' | 'unspecified',
          sourceUrl: String(form.get('sourceUrl') ?? ''),
          jobDescription: String(form.get('jobDescription') ?? ''),
          priority: String(form.get('priority') ?? 'medium') as
            'low' | 'medium' | 'high',
        },
      })
      await router.invalidate()
      setEditing(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save changes.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function scheduleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFollowUpBusy(true)
    setError(null)
    const formElement = event.currentTarget
    const form = new FormData(event.currentTarget)
    const dueValue = String(form.get('dueAt') ?? '')
    if (!dueValue || Number.isNaN(new Date(dueValue).getTime())) {
      setError('Choose a valid follow-up date and time.')
      setFollowUpBusy(false)
      return
    }
    try {
      await createFollowUp({
        data: {
          opportunityId: opportunity!.id,
          title: String(form.get('title') ?? ''),
          dueAt: new Date(dueValue).toISOString(),
        },
      })
      formElement.reset()
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to schedule follow-up.',
      )
    } finally {
      setFollowUpBusy(false)
    }
  }

  async function markComplete(followUpId: string) {
    setCompletingId(followUpId)
    setError(null)
    try {
      await completeFollowUp({
        data: { opportunityId: opportunity!.id, followUpId },
      })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to complete follow-up.',
      )
    } finally {
      setCompletingId(null)
    }
  }

  async function attachResume(resumeVersionId: string) {
    setResumeBusy(true)
    setError(null)
    try {
      await attachResumeToOpportunity({
        data: {
          opportunityId: opportunity!.id,
          resumeVersionId: resumeVersionId || null,
        },
      })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to attach this resume.',
      )
    } finally {
      setResumeBusy(false)
    }
  }

  return (
    <AppShell email={user.email}>
      <main className="workspace-page">
        <Link
          to="/opportunities"
          className="text-sm font-semibold text-[#47775b]"
        >
          ← All opportunities
        </Link>
        {opportunity.isSample && (
          <p className="mt-6 rounded-lg border border-[#eddfb7] bg-[#fff9e9] px-4 py-3 text-xs font-semibold text-[#8b6c25]">
            Sample opportunity · This is illustrative data, not part of your
            real job-search metrics.
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-start justify-between gap-6 border-b border-[#dbe3dd] pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#54746a]">
              {opportunity.companyName || 'Company not set'}
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[#1b352b]">
              {opportunity.title || 'Untitled role'}
            </h1>
            <p className="mt-3 text-sm text-[#52645f]">
              {opportunity.location || 'Location not set'} · Saved{' '}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
              }).format(new Date(opportunity.savedAt))}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="inline-flex items-center gap-2 rounded-md border border-[#d1dfd2] bg-white px-3 py-2 text-xs font-semibold text-[#315f48] hover:bg-[#f3f7f1] focus-visible:outline-2 focus-visible:outline-[#246b59]"
            >
              {editing ? (
                <X size={15} aria-hidden="true" />
              ) : (
                <Pencil size={15} aria-hidden="true" />
              )}
              {editing ? 'Cancel editing' : 'Edit details'}
            </button>
            <div>
              <label
                htmlFor="opportunity-status"
                className="block text-xs font-medium text-[#52645f]"
              >
                Application status
              </label>
              <select
                id="opportunity-status"
                value={opportunity.status}
                onChange={(event) =>
                  void updateStatus(event.target.value as OpportunityStatus)
                }
                className="mt-2 min-w-40 rounded-md border border-[#cbd8d0] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#246b59]"
              >
                {opportunityStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-6 text-sm text-[#9b2c31]">
            {error}
          </p>
        )}
        {editing && (
          <form
            onSubmit={saveDetails}
            className="mt-7 rounded-xl border border-[#dbe3dd] bg-white p-6"
            aria-label="Edit opportunity details"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-[#1e382d]">
                Edit opportunity
              </h2>
              <p className="mt-1 text-xs text-[#728478]">
                Update what you know. Your status history stays intact.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EditField
                label="Company"
                name="companyName"
                defaultValue={opportunity.companyName ?? ''}
              />
              <EditField
                label="Role"
                name="title"
                defaultValue={opportunity.title ?? ''}
              />
              <EditField
                label="Location"
                name="location"
                defaultValue={opportunity.location ?? ''}
              />
              <div>
                <label
                  htmlFor="edit-workMode"
                  className="block text-xs font-semibold"
                >
                  Work mode
                </label>
                <select
                  id="edit-workMode"
                  name="workMode"
                  defaultValue={opportunity.workMode ?? 'unspecified'}
                  className="workspace-form-control"
                >
                  <option value="unspecified">Not specified</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on_site">On-site</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="edit-priority"
                  className="block text-xs font-semibold"
                >
                  Priority
                </label>
                <select
                  id="edit-priority"
                  name="priority"
                  defaultValue={opportunity.priority}
                  className="workspace-form-control"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <EditField
                label="Job URL"
                name="sourceUrl"
                defaultValue={opportunity.sourceUrl ?? ''}
                type="url"
              />
            </div>
            <div className="mt-4">
              <label
                htmlFor="edit-jobDescription"
                className="block text-xs font-semibold"
              >
                Job description
              </label>
              <textarea
                id="edit-jobDescription"
                name="jobDescription"
                rows={8}
                defaultValue={opportunity.jobDescription ?? ''}
                className="workspace-form-control resize-y"
              />
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="workspace-primary-action"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
        <div className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section
            aria-labelledby="description-heading"
            className="min-w-0 border border-[#dbe3dd] bg-white p-6"
          >
            <h2 id="description-heading" className="text-lg font-semibold">
              Job description
            </h2>
            {opportunity.jobDescription ? (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#394f48]">
                {opportunity.jobDescription}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[#52645f]">
                No description added yet. Use Edit details to add the role's
                requirements.
              </p>
            )}
            {opportunity.sourceUrl &&
              /^https?:\/\//i.test(opportunity.sourceUrl) && (
                <a
                  href={opportunity.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block break-all text-sm"
                >
                  Open original posting ↗
                </a>
              )}
          </section>
          <div className="space-y-6 self-start">
            <section
              aria-labelledby="resume-heading"
              className="border border-[#dbe3dd] bg-white p-6"
            >
              <h2 id="resume-heading" className="text-lg font-semibold">
                Resume used
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#74847a]">
                Preserve the exact version sent with this application.
              </p>
              <label htmlFor="opportunity-resume" className="sr-only">
                Resume used for this opportunity
              </label>
              <select
                id="opportunity-resume"
                value={opportunity.resumeVersionId ?? ''}
                disabled={resumeBusy}
                onChange={(event) => void attachResume(event.target.value)}
                className="workspace-form-control mt-4"
              >
                <option value="">No resume attached</option>
                {resumes
                  .filter(
                    (resume) =>
                      !resume.isArchived ||
                      resume.id === opportunity.resumeVersionId,
                  )
                  .map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.name}
                      {resume.isArchived ? ' (archived)' : ''}
                    </option>
                  ))}
              </select>
              {!resumes.length && (
                <Link
                  to="/resumes"
                  className="mt-3 inline-block text-xs font-semibold text-[#2b7052]"
                >
                  Add your first resume →
                </Link>
              )}
            </section>
            <section
              aria-labelledby="followups-heading"
              className="border border-[#dbe3dd] bg-white p-6"
            >
              <h2 id="followups-heading" className="text-lg font-semibold">
                Follow-ups
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#74847a]">
                Set a next action for this opportunity.
              </p>
              <form onSubmit={scheduleFollowUp} className="mt-5 space-y-3">
                <div>
                  <label
                    htmlFor="follow-up-title"
                    className="block text-xs font-semibold"
                  >
                    What needs doing?
                  </label>
                  <input
                    id="follow-up-title"
                    name="title"
                    required
                    maxLength={160}
                    placeholder="Follow up with recruiter"
                    className="workspace-form-control"
                  />
                </div>
                <div>
                  <label
                    htmlFor="follow-up-due"
                    className="block text-xs font-semibold"
                  >
                    Due date and time
                  </label>
                  <input
                    id="follow-up-due"
                    name="dueAt"
                    type="datetime-local"
                    required
                    className="workspace-form-control"
                  />
                </div>
                <button
                  type="submit"
                  disabled={followUpBusy}
                  className="inline-flex items-center gap-2 rounded-md bg-[#e8f0e8] px-3 py-2 text-xs font-semibold text-[#245a43] hover:bg-[#dcebdc] disabled:opacity-60"
                >
                  <Plus size={14} aria-hidden="true" />
                  {followUpBusy ? 'Scheduling…' : 'Add follow-up'}
                </button>
              </form>
              <div className="mt-5 space-y-3 border-t border-[#e6ede5] pt-4">
                {opportunity.followUps.length === 0 ? (
                  <p className="text-xs leading-5 text-[#84948a]">
                    No follow-ups scheduled yet.
                  </p>
                ) : (
                  opportunity.followUps.map((followUp) => (
                    <div key={followUp.id} className="flex items-start gap-3">
                      <span
                        className={
                          followUp.completedAt
                            ? 'mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e3eee1] text-[#337550]'
                            : 'mt-1 h-5 w-5 shrink-0 rounded-full border border-[#adc3ad]'
                        }
                      >
                        {followUp.completedAt && (
                          <Check size={12} aria-hidden="true" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            followUp.completedAt
                              ? 'text-xs font-semibold text-[#9ba69a] line-through'
                              : 'text-xs font-semibold text-[#31513c]'
                          }
                        >
                          {followUp.title}
                        </p>
                        <time
                          dateTime={followUp.dueAt}
                          className="mt-1 block text-[11px] text-[#84948a]"
                        >
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(followUp.dueAt))}
                        </time>
                        {!followUp.completedAt && (
                          <button
                            type="button"
                            disabled={completingId === followUp.id}
                            onClick={() => void markComplete(followUp.id)}
                            className="mt-1 text-[11px] font-semibold text-[#2b7052] hover:underline"
                          >
                            {completingId === followUp.id
                              ? 'Completing…'
                              : 'Mark complete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <aside
              aria-labelledby="activity-heading"
              className="border border-[#dbe3dd] bg-white p-6"
            >
              <h2 id="activity-heading" className="text-lg font-semibold">
                Status history
              </h2>
              <ol className="mt-5 space-y-5 border-l border-[#cbd8d0] pl-4">
                {opportunity.history.map((event) => (
                  <li key={event.id}>
                    <p className="text-sm font-medium">
                      {event.fromStatus
                        ? `Moved to ${statusLabels[event.toStatus]}`
                        : `Saved as ${statusLabels[event.toStatus]}`}
                    </p>
                    <time
                      dateTime={event.occurredAt}
                      className="mt-1 block text-xs text-[#687a73]"
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(event.occurredAt))}
                    </time>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

function EditField({
  label,
  name,
  defaultValue,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
}) {
  return (
    <div>
      <label htmlFor={`edit-${name}`} className="block text-xs font-semibold">
        {label}
      </label>
      <input
        id={`edit-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="workspace-form-control"
      />
    </div>
  )
}
