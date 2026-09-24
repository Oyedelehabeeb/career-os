import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Plus, Trash2, UserRound } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

import {
  profileCompletion,
  skillCategories,
  skillProficiencies,
  workModes,
} from '../lib/profile'
import {
  addProfileSkill,
  removeProfileSkill,
  saveCareerProfile,
} from '../server/profile'
import type { CareerProfile, ProfileSkill } from '../lib/profile'

const emptyProfile: CareerProfile = {
  currentRole: '',
  targetRole: '',
  yearsExperience: null,
  professionalSummary: '',
  industries: [],
  location: '',
  preferredWorkModes: [],
  preferredRoleTypes: [],
  compensationMin: null,
  compensationMax: null,
  compensationCurrency: '',
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
}

const labels = {
  technical: 'Technical',
  tool: 'Tool',
  domain: 'Domain',
  soft: 'Soft skill',
  other: 'Other',
  learning: 'Learning',
  working: 'Working knowledge',
  strong: 'Strong',
  expert: 'Expert',
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
} as const

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

function commaList(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ProfileEditor({
  profile,
  skills,
}: {
  profile: CareerProfile | null
  skills: ProfileSkill[]
}) {
  const router = useRouter()
  const values = profile ?? emptyProfile
  const completion = profileCompletion(profile, skills.length)
  const [saving, setSaving] = useState(false)
  const [skillBusy, setSkillBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    try {
      await saveCareerProfile({
        data: {
          currentRole: String(form.get('currentRole') ?? ''),
          targetRole: String(form.get('targetRole') ?? ''),
          yearsExperience: numberOrNull(form.get('yearsExperience')),
          professionalSummary: String(form.get('professionalSummary') ?? ''),
          industries: commaList(form.get('industries')),
          location: String(form.get('location') ?? ''),
          preferredWorkModes: workModes.filter((mode) => form.has(mode)),
          preferredRoleTypes: commaList(form.get('preferredRoleTypes')),
          compensationMin: numberOrNull(form.get('compensationMin')),
          compensationMax: numberOrNull(form.get('compensationMax')),
          compensationCurrency: String(form.get('compensationCurrency') ?? ''),
          portfolioUrl: String(form.get('portfolioUrl') ?? ''),
          githubUrl: String(form.get('githubUrl') ?? ''),
          linkedinUrl: String(form.get('linkedinUrl') ?? ''),
        },
      })
      setMessage('Profile saved.')
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save your profile.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSkillBusy(true)
    setError(null)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    try {
      await addProfileSkill({
        data: {
          name: String(form.get('skillName') ?? ''),
          category: String(
            form.get('skillCategory'),
          ) as (typeof skillCategories)[number],
          proficiency: String(
            form.get('skillProficiency'),
          ) as (typeof skillProficiencies)[number],
        },
      })
      event.currentTarget.reset()
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to add this skill.',
      )
    } finally {
      setSkillBusy(false)
    }
  }

  async function removeSkill(skillId: string) {
    setSkillBusy(true)
    setError(null)
    try {
      await removeProfileSkill({ data: { skillId } })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to remove this skill.',
      )
    } finally {
      setSkillBusy(false)
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-topline">
        <span>CAREER FOUNDATION</span>
        <span>{completion}% complete</span>
      </div>
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Career profile</h1>
          <p className="workspace-page-subtitle">
            The private source of truth CareerOS will use to understand role
            fit.
          </p>
        </div>
      </div>

      {(error || message) && (
        <p
          role={error ? 'alert' : 'status'}
          className={error ? 'profile-notice is-error' : 'profile-notice'}
        >
          {error ?? message}
        </p>
      )}

      <section className="profile-progress" aria-label="Profile completion">
        <div className="profile-progress-copy">
          <span className="profile-progress-icon" aria-hidden="true">
            <UserRound size={20} strokeWidth={1.6} />
          </span>
          <div>
            <strong>{completion}% profile foundation</strong>
            <p>
              Add only what you know. Every field is optional and remains
              private.
            </p>
          </div>
        </div>
        <div
          className="profile-progress-track"
          role="progressbar"
          aria-label="Career profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <span style={{ width: `${completion}%` }} />
        </div>
      </section>

      <form onSubmit={saveProfile} className="profile-layout">
        <div className="profile-main">
          <ProfileSection
            eyebrow="DIRECTION"
            title="Where you are going"
            description="Give CareerOS enough context to compare opportunities with your actual goals."
          >
            <div className="profile-field-grid">
              <Field
                label="Current role"
                name="currentRole"
                defaultValue={values.currentRole}
                placeholder="e.g. Frontend engineer"
              />
              <Field
                label="Target role"
                name="targetRole"
                defaultValue={values.targetRole}
                placeholder="e.g. Senior product engineer"
              />
              <Field
                label="Years of experience"
                name="yearsExperience"
                type="number"
                min="0"
                max="70"
                step="0.5"
                defaultValue={values.yearsExperience ?? ''}
                placeholder="e.g. 5"
              />
              <Field
                label="Location"
                name="location"
                defaultValue={values.location}
                placeholder="City, country, or region"
              />
            </div>
            <TextArea
              label="Professional summary"
              name="professionalSummary"
              defaultValue={values.professionalSummary}
              placeholder="Describe the work you do best, the problems you solve, and where you want to grow."
            />
          </ProfileSection>

          <ProfileSection
            eyebrow="PREFERENCES"
            title="The work you want"
            description="These preferences help separate a promising role from one that is simply available."
          >
            <div className="profile-field-grid">
              <Field
                label="Industries"
                name="industries"
                defaultValue={values.industries.join(', ')}
                placeholder="Fintech, health, developer tools"
                help="Separate multiple values with commas."
              />
              <Field
                label="Role types"
                name="preferredRoleTypes"
                defaultValue={values.preferredRoleTypes.join(', ')}
                placeholder="Full-time, contract"
                help="Separate multiple values with commas."
              />
            </div>
            <fieldset className="profile-check-fieldset">
              <legend>Preferred work mode</legend>
              <div className="profile-checks">
                {workModes.map((mode) => (
                  <label key={mode}>
                    <input
                      type="checkbox"
                      name={mode}
                      defaultChecked={values.preferredWorkModes.includes(mode)}
                    />
                    <span>{labels[mode]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="profile-compensation">
              <Field
                label="Minimum compensation"
                name="compensationMin"
                type="number"
                min="0"
                step="1"
                defaultValue={values.compensationMin ?? ''}
                placeholder="Optional"
              />
              <Field
                label="Maximum compensation"
                name="compensationMax"
                type="number"
                min="0"
                step="1"
                defaultValue={values.compensationMax ?? ''}
                placeholder="Optional"
              />
              <Field
                label="Currency"
                name="compensationCurrency"
                defaultValue={values.compensationCurrency}
                placeholder="USD"
                maxLength={3}
              />
            </div>
          </ProfileSection>

          <ProfileSection
            eyebrow="PROOF OF WORK"
            title="Professional links"
            description="Add the public work you want considered later during opportunity analysis."
          >
            <div className="profile-field-grid">
              <Field
                label="Portfolio URL"
                name="portfolioUrl"
                type="url"
                defaultValue={values.portfolioUrl}
                placeholder="https://…"
              />
              <Field
                label="LinkedIn URL"
                name="linkedinUrl"
                type="url"
                defaultValue={values.linkedinUrl}
                placeholder="https://linkedin.com/in/…"
              />
              <Field
                label="GitHub URL"
                name="githubUrl"
                type="url"
                defaultValue={values.githubUrl}
                placeholder="https://github.com/…"
              />
            </div>
          </ProfileSection>
        </div>

        <aside className="profile-side">
          <section className="workspace-panel profile-skill-panel">
            <p className="overview-eyebrow">CAPABILITIES</p>
            <h2>Skills</h2>
            <p>
              A reusable skills record for matching and demand intelligence.
            </p>
            {skills.length ? (
              <ul className="profile-skills">
                {skills.map((skill) => (
                  <li key={skill.id}>
                    <span>
                      <strong>{skill.name}</strong>
                      <small>
                        {labels[skill.category]}
                        {skill.proficiency
                          ? ` · ${labels[skill.proficiency]}`
                          : ''}
                      </small>
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeSkill(skill.id)}
                      disabled={skillBusy}
                      aria-label={`Remove ${skill.name}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="profile-skills-empty">
                Your core skills will appear here.
              </div>
            )}
            <div className="profile-add-skill" aria-label="Add a skill">
              <Field
                label="Skill"
                name="skillName"
                placeholder="e.g. TypeScript"
                form="skill-form"
              />
              <label>
                <span>Category</span>
                <select name="skillCategory" form="skill-form">
                  {skillCategories.map((category) => (
                    <option key={category} value={category}>
                      {labels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Proficiency</span>
                <select name="skillProficiency" form="skill-form">
                  {skillProficiencies.map((level) => (
                    <option key={level} value={level}>
                      {labels[level]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                form="skill-form"
                className="profile-skill-action"
                disabled={skillBusy}
              >
                <Plus size={15} aria-hidden="true" />
                {skillBusy ? 'Working…' : 'Add skill'}
              </button>
            </div>
          </section>
        </aside>

        <div className="profile-save-bar">
          <span>Changes are saved only when you choose.</span>
          <button type="submit" disabled={saving}>
            <Check size={16} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
      <form id="skill-form" onSubmit={addSkill} />
    </main>
  )
}

function ProfileSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="workspace-panel profile-section">
      <p className="overview-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="profile-section-description">{description}</p>
      <div className="profile-section-body">{children}</div>
    </section>
  )
}

function Field({
  label,
  name,
  help,
  form,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  help?: string
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <input name={name} form={form} {...props} />
      {help && <small>{help}</small>}
    </label>
  )
}

function TextArea({
  label,
  name,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  name: string
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      <textarea name={name} rows={5} {...props} />
    </label>
  )
}
