import { useState } from 'react'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  RefreshCw,
  SearchCheck,
  Target,
} from 'lucide-react'
import { Link, useRouter } from '@tanstack/react-router'

import { runOpportunityFit } from '../server/opportunity-fit'
import type { JobAnalysis } from '../lib/job-intelligence'
import type { OpportunityFit } from '../lib/opportunity-fit'

const alignmentLabels = {
  aligned: 'Aligned',
  gap: 'Needs attention',
  unclear: 'Unclear',
  not_specified: 'Not specified',
} as const

export function CandidateFitPanel({
  opportunityId,
  jobAnalysis,
  fit,
}: {
  opportunityId: string
  jobAnalysis: JobAnalysis | null
  fit: OpportunityFit | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runFit() {
    setBusy(true)
    setError(null)
    try {
      await runOpportunityFit({ data: { opportunityId } })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to compare this role.',
      )
    } finally {
      setBusy(false)
    }
  }

  const ready = jobAnalysis?.reviewStatus === 'reviewed' && !jobAnalysis.isStale

  return (
    <section className="candidate-fit" aria-labelledby="candidate-fit-heading">
      <div className="candidate-fit-heading">
        <div>
          <p className="overview-eyebrow">CANDIDATE–ROLE FIT</p>
          <h2 id="candidate-fit-heading">What the evidence says</h2>
          <p>
            A transparent comparison of this role with your profile and selected
            resume. No synthetic match score.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runFit()}
          disabled={busy || !ready}
          className="candidate-fit-run"
        >
          {fit ? (
            <RefreshCw size={16} aria-hidden="true" />
          ) : (
            <SearchCheck size={16} aria-hidden="true" />
          )}
          {busy ? 'Comparing…' : fit ? 'Refresh comparison' : 'Compare fit'}
        </button>
      </div>

      {error && (
        <p role="alert" className="fit-notice is-error">
          {error}
        </p>
      )}

      {!ready && (
        <div className="fit-prerequisite">
          <CircleHelp size={20} aria-hidden="true" />
          <div>
            <strong>Review the job requirements first</strong>
            <p>
              Fit analysis uses the reviewed requirements above so corrections
              remain the source of truth.
            </p>
          </div>
        </div>
      )}

      {fit?.isStale && (
        <div className="fit-notice is-warning" role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          Your profile, selected resume, or job analysis changed. Refresh this
          comparison before relying on it.
        </div>
      )}

      {!fit && ready && (
        <div className="candidate-fit-empty">
          <Target size={27} strokeWidth={1.5} aria-hidden="true" />
          <strong>Ready to compare</strong>
          <p>
            CareerOS will show evidence and gaps without hiding the reasoning
            behind a percentage.
          </p>
        </div>
      )}

      {fit && (
        <div className={fit.isStale ? 'fit-results is-stale' : 'fit-results'}>
          {!fit.resumeEvidenceAvailable && (
            <div className="fit-notice">
              <CircleHelp size={17} aria-hidden="true" />
              Resume coverage is not assessed because the selected resume has no
              searchable text. Add it in <Link to="/resumes">Resumes</Link>.
            </div>
          )}

          <div className="fit-alignment-grid">
            {[
              ['Experience', fit.experienceAlignment, BriefcaseBusiness],
              ['Seniority', fit.seniorityAlignment, Target],
              ['Work mode', fit.workModeAlignment, CheckCircle2],
            ].map(([label, alignment, Icon]) => {
              const item = alignment as OpportunityFit['experienceAlignment']
              const AlignmentIcon = Icon as typeof Target
              return (
                <article key={label as string}>
                  <div>
                    <AlignmentIcon size={17} aria-hidden="true" />
                    <span>{label as string}</span>
                  </div>
                  <strong data-status={item.status}>
                    {alignmentLabels[item.status]}
                  </strong>
                  <p>{item.summary}</p>
                </article>
              )
            })}
          </div>

          <div className="fit-skill-columns">
            <section aria-labelledby="matched-skills-heading">
              <h3 id="matched-skills-heading">
                Matched evidence <span>{fit.matchedSkills.length}</span>
              </h3>
              {fit.matchedSkills.length ? (
                <ul className="fit-evidence-list">
                  {fit.matchedSkills.map((skill) => (
                    <li key={skill.name}>
                      <div>
                        <strong>{skill.name}</strong>
                        <small>
                          {skill.requirement === 'required'
                            ? 'Required'
                            : 'Preferred'}
                          {skill.proficiency
                            ? ` · ${skill.proficiency} proficiency`
                            : ''}
                        </small>
                      </div>
                      <span>{skill.sources.join(' + ')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fit-empty-copy">
                  No matching evidence found yet.
                </p>
              )}
            </section>

            <section aria-labelledby="skill-gaps-heading">
              <h3 id="skill-gaps-heading">
                Missing or unclear{' '}
                <span>
                  {fit.missingRequiredSkills.length +
                    fit.missingPreferredSkills.length +
                    fit.resumeGaps.length}
                </span>
              </h3>
              {!fit.missingRequiredSkills.length &&
              !fit.missingPreferredSkills.length &&
              !fit.resumeGaps.length ? (
                <p className="fit-empty-copy">
                  Every extracted skill has supporting evidence.
                </p>
              ) : (
                <div className="fit-gap-groups">
                  {fit.missingRequiredSkills.length > 0 && (
                    <div>
                      <strong>Required</strong>
                      <p>{fit.missingRequiredSkills.join(', ')}</p>
                    </div>
                  )}
                  {fit.missingPreferredSkills.length > 0 && (
                    <div>
                      <strong>Preferred</strong>
                      <p>{fit.missingPreferredSkills.join(', ')}</p>
                    </div>
                  )}
                  {fit.resumeGaps.length > 0 && (
                    <div>
                      <strong>In profile, absent from resume</strong>
                      <p>{fit.resumeGaps.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="fit-preparation" aria-labelledby="prep-heading">
            <div>
              <p className="overview-eyebrow">PREPARATION</p>
              <h3 id="prep-heading">Topics worth preparing</h3>
            </div>
            {fit.preparationTopics.length ? (
              <ol>
                {fit.preparationTopics.map((item) => (
                  <li key={`${item.priority}-${item.topic}`}>
                    <span data-priority={item.priority}>{item.priority}</span>
                    <div>
                      <strong>{item.topic}</strong>
                      <p>{item.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="fit-empty-copy">
                No preparation gaps were identified from the available evidence.
              </p>
            )}
          </section>

          <p className="fit-method-note">
            Generated with explainable local rules · Updated{' '}
            {new Intl.DateTimeFormat('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(fit.updatedAt))}
          </p>
        </div>
      )}
    </section>
  )
}
