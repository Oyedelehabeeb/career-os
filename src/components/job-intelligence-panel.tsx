import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  AlertTriangle,
  Check,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

import { seniorityLevels } from '../lib/job-intelligence'
import { analyzeOpportunity, saveJobAnalysis } from '../server/job-intelligence'
import type { JobAnalysis } from '../lib/job-intelligence'

const labels = {
  entry: 'Entry level',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead / manager',
  staff: 'Staff',
  principal: 'Principal',
  executive: 'Executive',
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
} as const

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

function commaList(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function lineList(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      String(value ?? '')
        .split(/\r?\n/)
        .map((item) => item.replace(/^[-•*\s]+/, '').trim())
        .filter(Boolean),
    ),
  ]
}

export function JobIntelligencePanel({
  opportunityId,
  hasDescription,
  analysis,
}: {
  opportunityId: string
  hasDescription: boolean
  analysis: JobAnalysis | null
}) {
  const router = useRouter()
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function extract() {
    setExtracting(true)
    setError(null)
    setMessage(null)
    try {
      await analyzeOpportunity({ data: { opportunityId } })
      setMessage('Requirements extracted. Review them before saving.')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to extract this job description.',
      )
    } finally {
      setExtracting(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!analysis) return
    setSaving(true)
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    try {
      await saveJobAnalysis({
        data: {
          opportunityId,
          sourceHash: analysis.sourceHash,
          seniority:
            (String(form.get('seniority') ?? '') as JobAnalysis['seniority']) ||
            null,
          experienceMin: numberOrNull(form.get('experienceMin')),
          experienceMax: numberOrNull(form.get('experienceMax')),
          workMode:
            (String(form.get('workMode') ?? '') as JobAnalysis['workMode']) ||
            null,
          location: String(form.get('location') ?? ''),
          salaryMin: numberOrNull(form.get('salaryMin')),
          salaryMax: numberOrNull(form.get('salaryMax')),
          salaryCurrency: String(form.get('salaryCurrency') ?? ''),
          responsibilities: lineList(form.get('responsibilities')),
          requiredSkills: commaList(form.get('requiredSkills')),
          preferredSkills: commaList(form.get('preferredSkills')),
          educationRequirements: lineList(form.get('educationRequirements')),
          technologies: commaList(form.get('technologies')),
        },
      })
      setMessage('Reviewed intelligence saved.')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save the reviewed intelligence.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      aria-labelledby="intelligence-heading"
      className="job-intelligence"
    >
      <div className="job-intelligence-heading">
        <span aria-hidden="true">
          <Sparkles size={20} strokeWidth={1.6} />
        </span>
        <div>
          <p className="overview-eyebrow">JOB INTELLIGENCE</p>
          <h2 id="intelligence-heading">Turn the posting into a clear brief</h2>
          <p>
            Rules-based extraction works without an AI provider. You remain the
            final reviewer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void extract()}
          disabled={!hasDescription || extracting}
          className="job-intelligence-extract"
        >
          {analysis ? (
            <RefreshCw size={15} aria-hidden="true" />
          ) : (
            <ScanSearch size={15} aria-hidden="true" />
          )}
          {extracting
            ? 'Extracting…'
            : analysis
              ? 'Extract again'
              : 'Extract requirements'}
        </button>
      </div>

      {!hasDescription && (
        <div className="job-intelligence-empty">
          Add a fuller job description above to extract requirements.
        </div>
      )}
      {hasDescription && !analysis && (
        <div className="job-intelligence-empty">
          <ScanSearch size={24} strokeWidth={1.4} aria-hidden="true" />
          <strong>No structured brief yet</strong>
          <p>
            Extract an editable first pass without sending the description to a
            third-party model.
          </p>
        </div>
      )}

      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className={
            error ? 'intelligence-notice is-error' : 'intelligence-notice'
          }
        >
          {error ?? message}
        </p>
      )}

      {analysis && (
        <form onSubmit={save} className="intelligence-form">
          <div className="intelligence-meta">
            <span className={`intelligence-status is-${analysis.reviewStatus}`}>
              {analysis.reviewStatus === 'reviewed' ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <ScanSearch size={12} aria-hidden="true" />
              )}
              {analysis.reviewStatus === 'reviewed'
                ? 'Reviewed by you'
                : 'Needs your review'}
            </span>
            <span>Local rules · {analysis.parserVersion}</span>
          </div>
          {analysis.isStale && (
            <div className="intelligence-stale" role="status">
              <AlertTriangle size={16} aria-hidden="true" />
              The job description changed. Extract it again before reviewing.
            </div>
          )}

          <div className="intelligence-field-grid">
            <label>
              <span>Seniority</span>
              <select name="seniority" defaultValue={analysis.seniority ?? ''}>
                <option value="">Not clear</option>
                {seniorityLevels.map((level) => (
                  <option key={level} value={level}>
                    {labels[level]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Work mode</span>
              <select name="workMode" defaultValue={analysis.workMode ?? ''}>
                <option value="">Not clear</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on_site">On-site</option>
              </select>
            </label>
            <label>
              <span>Minimum experience</span>
              <input
                type="number"
                name="experienceMin"
                min="0"
                max="70"
                step="0.5"
                defaultValue={analysis.experienceMin ?? ''}
                placeholder="Years"
              />
            </label>
            <label>
              <span>Maximum experience</span>
              <input
                type="number"
                name="experienceMax"
                min="0"
                max="70"
                step="0.5"
                defaultValue={analysis.experienceMax ?? ''}
                placeholder="Optional"
              />
            </label>
            <label className="is-wide">
              <span>Location</span>
              <input
                name="location"
                maxLength={200}
                defaultValue={analysis.location}
                placeholder="Not specified"
              />
            </label>
          </div>

          <div className="intelligence-salary">
            <label>
              <span>Salary minimum</span>
              <input
                type="number"
                min="0"
                name="salaryMin"
                defaultValue={analysis.salaryMin ?? ''}
              />
            </label>
            <label>
              <span>Salary maximum</span>
              <input
                type="number"
                min="0"
                name="salaryMax"
                defaultValue={analysis.salaryMax ?? ''}
              />
            </label>
            <label>
              <span>Currency</span>
              <input
                name="salaryCurrency"
                maxLength={3}
                defaultValue={analysis.salaryCurrency}
                placeholder="USD"
              />
            </label>
          </div>

          <IntelligenceTextArea
            label="Required skills"
            help="Comma-separated. Move anything that was classified incorrectly."
            name="requiredSkills"
            rows={3}
            defaultValue={analysis.requiredSkills.join(', ')}
          />
          <IntelligenceTextArea
            label="Preferred skills"
            help="Comma-separated nice-to-have capabilities."
            name="preferredSkills"
            rows={3}
            defaultValue={analysis.preferredSkills.join(', ')}
          />
          <IntelligenceTextArea
            label="Technologies mentioned"
            help="Comma-separated tools, languages, and platforms."
            name="technologies"
            rows={3}
            defaultValue={analysis.technologies.join(', ')}
          />
          <IntelligenceTextArea
            label="Responsibilities"
            help="One responsibility per line."
            name="responsibilities"
            rows={6}
            defaultValue={analysis.responsibilities.join('\n')}
          />
          <IntelligenceTextArea
            label="Education requirements"
            help="One requirement per line."
            name="educationRequirements"
            rows={3}
            defaultValue={analysis.educationRequirements.join('\n')}
          />

          <div className="intelligence-save">
            <p>
              Saving marks this extraction as reviewed; it does not alter the
              original job description.
            </p>
            <button type="submit" disabled={saving || analysis.isStale}>
              <Check size={15} aria-hidden="true" />
              {saving ? 'Saving…' : 'Save reviewed brief'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function IntelligenceTextArea({
  label,
  help,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  help: string
}) {
  return (
    <label className="intelligence-textarea">
      <span>{label}</span>
      <small>{help}</small>
      <textarea {...props} />
    </label>
  )
}
