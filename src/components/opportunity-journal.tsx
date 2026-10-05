import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  CalendarDays,
  ExternalLink,
  Mail,
  Pencil,
  Plus,
  StickyNote,
  UserRound,
  Users,
} from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

import {
  interviewOutcomes,
  interviewTypeLabels,
  interviewTypes,
} from '../lib/opportunity-records'
import {
  createContact,
  createInterview,
  createNote,
  updateContact,
  updateInterview,
  updateNote,
} from '../server/opportunity-records'
import type {
  OpportunityContact,
  OpportunityInterview,
  OpportunityNote,
  OpportunityRecords,
} from '../lib/opportunity-records'

type JournalTab = 'contacts' | 'interviews' | 'notes'

const outcomeLabels = {
  advanced: 'Advanced',
  no_decision: 'No decision yet',
  rejected: 'Rejected',
  offer: 'Offer',
  withdrawn: 'Withdrawn',
} as const

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text ? Number(text) : null
}

function localDateTimeValue(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function OpportunityJournal({
  opportunityId,
  records,
}: {
  opportunityId: string
  records: OpportunityRecords
}) {
  const router = useRouter()
  const [tab, setTab] = useState<JournalTab>('interviews')
  const [contactEditor, setContactEditor] = useState<string | 'new' | null>(
    null,
  )
  const [interviewEditor, setInterviewEditor] = useState<string | 'new' | null>(
    null,
  )
  const [noteEditor, setNoteEditor] = useState<string | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function completeAction(
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await action()
      setContactEditor(null)
      setInterviewEditor(null)
      setNoteEditor(null)
      setMessage(success)
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save changes.',
      )
    } finally {
      setBusy(false)
    }
  }

  function saveContact(
    event: FormEvent<HTMLFormElement>,
    contact: OpportunityContact | null,
  ) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fields = {
      opportunityId,
      name: String(form.get('name') ?? ''),
      role: String(form.get('role') ?? ''),
      email: String(form.get('email') ?? ''),
      profileUrl: String(form.get('profileUrl') ?? ''),
      notes: String(form.get('notes') ?? ''),
    }
    void completeAction(
      () =>
        contact
          ? updateContact({ data: { ...fields, contactId: contact.id } })
          : createContact({ data: fields }),
      contact ? 'Contact updated.' : 'Contact added.',
    )
  }

  function saveInterview(
    event: FormEvent<HTMLFormElement>,
    interview: OpportunityInterview | null,
  ) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const scheduledValue = String(form.get('scheduledAt') ?? '')
    if (!scheduledValue || Number.isNaN(new Date(scheduledValue).getTime())) {
      setError('Choose a valid interview date and time.')
      return
    }
    const outcome = String(form.get('outcome') ?? '')
    const fields = {
      opportunityId,
      contactId: String(form.get('contactId') ?? '') || null,
      interviewType: String(
        form.get('interviewType'),
      ) as OpportunityInterview['interviewType'],
      stage: String(form.get('stage') ?? ''),
      scheduledAt: new Date(scheduledValue).toISOString(),
      durationMinutes: numberOrNull(form.get('durationMinutes')),
      locationOrUrl: String(form.get('locationOrUrl') ?? ''),
      status: String(form.get('status')) as OpportunityInterview['status'],
      outcome: (outcome || null) as OpportunityInterview['outcome'],
      preparationNotes: String(form.get('preparationNotes') ?? ''),
      postInterviewNotes: String(form.get('postInterviewNotes') ?? ''),
    }
    void completeAction(
      () =>
        interview
          ? updateInterview({
              data: { ...fields, interviewId: interview.id },
            })
          : createInterview({ data: fields }),
      interview ? 'Interview updated.' : 'Interview scheduled.',
    )
  }

  function saveNote(
    event: FormEvent<HTMLFormElement>,
    note: OpportunityNote | null,
  ) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fields = {
      opportunityId,
      body: String(form.get('body') ?? ''),
    }
    void completeAction(
      () =>
        note
          ? updateNote({ data: { ...fields, noteId: note.id } })
          : createNote({ data: fields }),
      note ? 'Note updated.' : 'Note added.',
    )
  }

  const tabs: Array<{
    id: JournalTab
    label: string
    count: number
    icon: typeof Users
  }> = [
    {
      id: 'contacts',
      label: 'Contacts',
      count: records.contacts.length,
      icon: Users,
    },
    {
      id: 'interviews',
      label: 'Interviews',
      count: records.interviews.length,
      icon: CalendarDays,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: records.notes.length,
      icon: StickyNote,
    },
  ]

  return (
    <section className="opportunity-journal" aria-labelledby="journal-heading">
      <div className="journal-heading">
        <div>
          <p className="overview-eyebrow">APPLICATION RECORD</p>
          <h2 id="journal-heading">People, conversations, and context</h2>
          <p>
            Keep the human details attached to the opportunity they belong to.
          </p>
        </div>
      </div>
      <div
        className="journal-tabs"
        role="tablist"
        aria-label="Application record"
      >
        {tabs.map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`journal-panel-${id}`}
            id={`journal-tab-${id}`}
            className={tab === id ? 'is-active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={15} aria-hidden="true" />
            {label} <span>{count}</span>
          </button>
        ))}
      </div>

      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className={error ? 'journal-notice is-error' : 'journal-notice'}
        >
          {error ?? message}
        </p>
      )}

      {tab === 'contacts' && (
        <div
          role="tabpanel"
          id="journal-panel-contacts"
          aria-labelledby="journal-tab-contacts"
          className="journal-panel"
        >
          <PanelAction
            title="Opportunity contacts"
            copy="Recruiters, hiring managers, referrals, and interviewers."
            action="Add contact"
            onClick={() => setContactEditor('new')}
          />
          {contactEditor === 'new' && (
            <ContactForm
              busy={busy}
              onCancel={() => setContactEditor(null)}
              onSubmit={(event) => saveContact(event, null)}
            />
          )}
          {records.contacts.length ? (
            <ul className="contact-list">
              {records.contacts.map((contact) => (
                <li key={contact.id}>
                  {contactEditor === contact.id ? (
                    <ContactForm
                      contact={contact}
                      busy={busy}
                      onCancel={() => setContactEditor(null)}
                      onSubmit={(event) => saveContact(event, contact)}
                    />
                  ) : (
                    <>
                      <span className="journal-record-icon" aria-hidden="true">
                        <UserRound size={18} />
                      </span>
                      <div className="contact-main">
                        <strong>{contact.name}</strong>
                        <p>{contact.role || 'Role not specified'}</p>
                        <div>
                          {contact.email && (
                            <a href={`mailto:${contact.email}`}>
                              <Mail size={12} aria-hidden="true" />{' '}
                              {contact.email}
                            </a>
                          )}
                          {contact.profileUrl && (
                            <a
                              href={contact.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={12} aria-hidden="true" />{' '}
                              Profile
                            </a>
                          )}
                        </div>
                        {contact.notes && <span>{contact.notes}</span>}
                      </div>
                      <button
                        type="button"
                        className="journal-edit"
                        onClick={() => setContactEditor(contact.id)}
                      >
                        <Pencil size={13} aria-hidden="true" /> Edit
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <JournalEmpty icon={<Users />} title="No contacts yet">
              Add someone when a recruiter, referral, or interviewer enters the
              process.
            </JournalEmpty>
          )}
        </div>
      )}

      {tab === 'interviews' && (
        <div
          role="tabpanel"
          id="journal-panel-interviews"
          aria-labelledby="journal-tab-interviews"
          className="journal-panel"
        >
          <PanelAction
            title="Interview plan"
            copy="Schedule each stage, prepare deliberately, and capture the outcome."
            action="Schedule interview"
            onClick={() => setInterviewEditor('new')}
          />
          {interviewEditor === 'new' && (
            <InterviewForm
              contacts={records.contacts}
              busy={busy}
              onCancel={() => setInterviewEditor(null)}
              onSubmit={(event) => saveInterview(event, null)}
            />
          )}
          {records.interviews.length ? (
            <ol className="interview-list">
              {records.interviews.map((interview) => (
                <li key={interview.id}>
                  {interviewEditor === interview.id ? (
                    <InterviewForm
                      interview={interview}
                      contacts={records.contacts}
                      busy={busy}
                      onCancel={() => setInterviewEditor(null)}
                      onSubmit={(event) => saveInterview(event, interview)}
                    />
                  ) : (
                    <>
                      <div className="interview-date">
                        <span>
                          {new Intl.DateTimeFormat('en-GB', {
                            month: 'short',
                          }).format(new Date(interview.scheduledAt))}
                        </span>
                        <strong>
                          {new Intl.DateTimeFormat('en-GB', {
                            day: '2-digit',
                          }).format(new Date(interview.scheduledAt))}
                        </strong>
                      </div>
                      <div className="interview-main">
                        <div>
                          <strong>
                            {interviewTypeLabels[interview.interviewType]}
                          </strong>
                          <span data-status={interview.status}>
                            {interview.status}
                          </span>
                        </div>
                        <p>
                          {formatDateTime(interview.scheduledAt)}
                          {interview.durationMinutes
                            ? ` · ${interview.durationMinutes} min`
                            : ''}
                        </p>
                        <small>
                          {[interview.stage, interview.contactName]
                            .filter(Boolean)
                            .join(' · ') ||
                            'Stage and interviewer not specified'}
                        </small>
                        {interview.locationOrUrl &&
                          (/^https?:\/\//i.test(interview.locationOrUrl) ? (
                            <a
                              href={interview.locationOrUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join or open location{' '}
                              <ExternalLink size={11} aria-hidden="true" />
                            </a>
                          ) : (
                            <em>{interview.locationOrUrl}</em>
                          ))}
                        {interview.outcome && (
                          <b>Outcome: {outcomeLabels[interview.outcome]}</b>
                        )}
                      </div>
                      <button
                        type="button"
                        className="journal-edit"
                        onClick={() => setInterviewEditor(interview.id)}
                      >
                        <Pencil size={13} aria-hidden="true" /> Update
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <JournalEmpty
              icon={<CalendarDays />}
              title="No interviews scheduled"
            >
              When a conversation is booked, keep its link, preparation, and
              outcome here.
            </JournalEmpty>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div
          role="tabpanel"
          id="journal-panel-notes"
          aria-labelledby="journal-tab-notes"
          className="journal-panel"
        >
          <PanelAction
            title="Private notes"
            copy="Capture context worth remembering without cluttering the status history."
            action="Add note"
            onClick={() => setNoteEditor('new')}
          />
          {noteEditor === 'new' && (
            <NoteForm
              busy={busy}
              onCancel={() => setNoteEditor(null)}
              onSubmit={(event) => saveNote(event, null)}
            />
          )}
          {records.notes.length ? (
            <ul className="note-list">
              {records.notes.map((note) => (
                <li key={note.id}>
                  {noteEditor === note.id ? (
                    <NoteForm
                      note={note}
                      busy={busy}
                      onCancel={() => setNoteEditor(null)}
                      onSubmit={(event) => saveNote(event, note)}
                    />
                  ) : (
                    <>
                      <p>{note.body}</p>
                      <div>
                        <time dateTime={note.createdAt}>
                          {formatDateTime(note.createdAt)}
                        </time>
                        <button
                          type="button"
                          onClick={() => setNoteEditor(note.id)}
                        >
                          <Pencil size={12} aria-hidden="true" /> Edit
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <JournalEmpty icon={<StickyNote />} title="No notes yet">
              Save call context, application decisions, or details you want to
              revisit.
            </JournalEmpty>
          )}
        </div>
      )}
    </section>
  )
}

function PanelAction({
  title,
  copy,
  action,
  onClick,
}: {
  title: string
  copy: string
  action: string
  onClick: () => void
}) {
  return (
    <div className="journal-panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <button type="button" onClick={onClick}>
        <Plus size={14} aria-hidden="true" /> {action}
      </button>
    </div>
  )
}

function FormActions({
  busy,
  onCancel,
}: {
  busy: boolean
  onCancel: () => void
}) {
  return (
    <div className="journal-form-actions">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="is-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function ContactForm({
  contact,
  busy,
  onCancel,
  onSubmit,
}: {
  contact?: OpportunityContact
  busy: boolean
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="journal-form" onSubmit={onSubmit}>
      <div className="journal-form-grid">
        <Field label="Name" name="name" required defaultValue={contact?.name} />
        <Field
          label="Role"
          name="role"
          defaultValue={contact?.role}
          placeholder="Recruiter"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={contact?.email}
        />
        <Field
          label="LinkedIn or profile URL"
          name="profileUrl"
          type="url"
          defaultValue={contact?.profileUrl}
        />
      </div>
      <TextField
        label="Context"
        name="notes"
        rows={3}
        defaultValue={contact?.notes}
      />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  )
}

function InterviewForm({
  interview,
  contacts,
  busy,
  onCancel,
  onSubmit,
}: {
  interview?: OpportunityInterview
  contacts: OpportunityContact[]
  busy: boolean
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="journal-form" onSubmit={onSubmit}>
      <div className="journal-form-grid">
        <label>
          <span>Interview type</span>
          <select
            name="interviewType"
            defaultValue={interview?.interviewType ?? 'recruiter_screen'}
          >
            {interviewTypes.map((type) => (
              <option key={type} value={type}>
                {interviewTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Stage"
          name="stage"
          defaultValue={interview?.stage}
          placeholder="Round one"
        />
        <Field
          label="Date and time"
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={
            interview ? localDateTimeValue(interview.scheduledAt) : ''
          }
        />
        <Field
          label="Duration (minutes)"
          name="durationMinutes"
          type="number"
          min={15}
          max={480}
          defaultValue={interview?.durationMinutes ?? ''}
        />
        <label>
          <span>Interviewer</span>
          <select name="contactId" defaultValue={interview?.contactId ?? ''}>
            <option value="">Not linked</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Location or video URL"
          name="locationOrUrl"
          defaultValue={interview?.locationOrUrl}
          placeholder="Office or https://…"
        />
        <label>
          <span>Status</span>
          <select name="status" defaultValue={interview?.status ?? 'scheduled'}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label>
          <span>Outcome</span>
          <select name="outcome" defaultValue={interview?.outcome ?? ''}>
            <option value="">Not recorded</option>
            {interviewOutcomes.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcomeLabels[outcome]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TextField
        label="Preparation notes"
        name="preparationNotes"
        rows={4}
        defaultValue={interview?.preparationNotes}
      />
      <TextField
        label="Post-interview notes"
        name="postInterviewNotes"
        rows={4}
        defaultValue={interview?.postInterviewNotes}
      />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  )
}

function NoteForm({
  note,
  busy,
  onCancel,
  onSubmit,
}: {
  note?: OpportunityNote
  busy: boolean
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="journal-form" onSubmit={onSubmit}>
      <TextField
        label="Note"
        name="body"
        rows={6}
        required
        defaultValue={note?.body}
      />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  placeholder,
  required,
  min,
  max,
}: {
  label: string
  name: string
  defaultValue?: string | number
  type?: string
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
      />
    </label>
  )
}

function TextField({
  label,
  name,
  rows,
  defaultValue,
  required,
}: {
  label: string
  name: string
  rows: number
  defaultValue?: string
  required?: boolean
}) {
  return (
    <label className="journal-textarea">
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  )
}

function JournalEmpty({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="journal-empty">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}
