import {
  ArrowRight,
  BriefcaseBusiness,
  CircleCheck,
  Clock3,
  Plus,
  Sparkles,
} from 'lucide-react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { statusLabels } from '../lib/opportunity'
import { profileCompletion } from '../lib/profile'
import { getCurrentUser } from '../server/auth'
import { listDueFollowUps, listOpportunities } from '../server/opportunities'
import { getCareerProfile } from '../server/profile'
import type { OpportunitySummary } from '../lib/opportunity'

const activeStatuses = new Set([
  'saved',
  'preparing',
  'applied',
  'screening',
  'interview',
  'final_round',
])
const progressStatuses = new Set([
  'screening',
  'interview',
  'final_round',
  'offer',
])

export const Route = createFileRoute('/app')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: async () => {
    const [opportunities, followUps, careerProfile] = await Promise.all([
      listOpportunities(),
      listDueFollowUps(),
      getCareerProfile(),
    ])
    return { opportunities, followUps, careerProfile }
  },
  component: AppHome,
  errorComponent: ({ error }) => (
    <main className="workspace-page">
      <h1 className="workspace-page-title">Overview unavailable</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
    </main>
  ),
})

function Stat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number
  detail: string
  icon: typeof BriefcaseBusiness
}) {
  return (
    <div className="overview-stat">
      <div className="overview-stat-heading">
        <span>{label}</span>
        <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function OpportunityRow({ opportunity }: { opportunity: OpportunitySummary }) {
  return (
    <Link
      className="overview-row"
      to="/opportunities/$opportunityId"
      params={{ opportunityId: opportunity.id }}
    >
      <span className="overview-row-initial" aria-hidden="true">
        {(opportunity.companyName || opportunity.title || 'R')
          .charAt(0)
          .toUpperCase()}
      </span>
      <span className="overview-row-main">
        <strong>{opportunity.title || 'Untitled role'}</strong>
        {opportunity.isSample && <em className="overview-sample">Sample</em>}
        <small>{opportunity.companyName || 'Company not set'}</small>
      </span>
      <span className={`workspace-status status-${opportunity.status}`}>
        {statusLabels[opportunity.status]}
      </span>
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  )
}

function AppHome() {
  const { user } = Route.useRouteContext()
  const { opportunities, followUps, careerProfile } = Route.useLoaderData()
  const completion = profileCompletion(
    careerProfile.profile,
    careerProfile.skills.length,
  )
  const realOpportunities = opportunities.filter((item) => !item.isSample)
  const active = realOpportunities.filter((item) =>
    activeStatuses.has(item.status),
  )
  const applied = realOpportunities.filter(
    (item) => item.status !== 'saved' && item.status !== 'preparing',
  )
  const progressed = realOpportunities.filter((item) =>
    progressStatuses.has(item.status),
  )
  const recent = opportunities.slice(0, 4)

  return (
    <AppShell email={user.email}>
      <main className="workspace-page">
        <div className="workspace-page-topline">
          <span>WORKSPACE OVERVIEW</span>
          <span>
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(
              new Date(),
            )}
          </span>
        </div>
        <div className="workspace-page-heading">
          <div>
            <h1 className="workspace-page-title">Your job search, in focus.</h1>
            <p className="workspace-page-subtitle">
              A clear view of your pipeline and the next step worth taking.
            </p>
          </div>
          <Link to="/opportunities" className="workspace-primary-action">
            <Plus size={17} aria-hidden="true" /> Add opportunity
          </Link>
        </div>

        <section className="overview-hero" aria-labelledby="attention-heading">
          <div className="overview-hero-icon">
            <Sparkles size={22} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <p className="overview-eyebrow">YOUR NEXT MOVE</p>
            <h2 id="attention-heading">
              {realOpportunities.length === 0
                ? opportunities.length > 0
                  ? 'Explore your sample workspace.'
                  : 'Start with one opportunity.'
                : active.length > 0
                  ? 'Keep your active roles moving.'
                  : 'Your pipeline is ready for a new lead.'}
            </h2>
            <p>
              {realOpportunities.length === 0
                ? opportunities.length > 0
                  ? 'The example roles show how CareerOS works. They are labeled Sample and excluded from your pipeline metrics.'
                  : 'Save a role you are considering. Even a company name or job link is enough to begin.'
                : active.length > 0
                  ? `You have ${active.length} active ${active.length === 1 ? 'opportunity' : 'opportunities'}. Review the latest one, update its status, or capture the next role.`
                  : 'Your saved roles are no longer active. Add a new opportunity when you find one worth tracking.'}
            </p>
          </div>
          {recent.length ? (
            <Link
              to="/opportunities/$opportunityId"
              params={{ opportunityId: recent[0].id }}
              className="overview-hero-link"
            >
              {realOpportunities.length === 0
                ? 'Explore sample role'
                : 'Review latest role'}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/opportunities" className="overview-hero-link">
              Add your first role <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </section>

        <section aria-label="Pipeline snapshot" className="overview-stats">
          <Stat
            label="Active opportunities"
            value={active.length}
            detail="Still in motion"
            icon={BriefcaseBusiness}
          />
          <Stat
            label="Applications & beyond"
            value={applied.length}
            detail="Submitted or progressed"
            icon={CircleCheck}
          />
          <Stat
            label="Conversations"
            value={progressed.length}
            detail="Screening through offer"
            icon={Clock3}
          />
        </section>

        <section
          className="workspace-panel overview-attention"
          aria-labelledby="followups-heading"
        >
          <div className="workspace-panel-heading">
            <div>
              <p className="overview-eyebrow">WHAT NEEDS ATTENTION</p>
              <h2 id="followups-heading">Upcoming follow-ups</h2>
            </div>
          </div>
          {followUps.length ? (
            <div className="overview-followups">
              {followUps.map((followUp) => {
                const overdue = new Date(followUp.dueAt).getTime() < Date.now()
                return (
                  <Link
                    key={followUp.id}
                    to="/opportunities/$opportunityId"
                    params={{ opportunityId: followUp.opportunityId }}
                    className="overview-followup"
                  >
                    <span
                      className={
                        overdue
                          ? 'overview-followup-date is-overdue'
                          : 'overview-followup-date'
                      }
                    >
                      {overdue
                        ? 'Overdue'
                        : new Intl.DateTimeFormat(undefined, {
                            month: 'short',
                            day: 'numeric',
                          }).format(new Date(followUp.dueAt))}
                    </span>
                    <span>
                      <strong>{followUp.title}</strong>
                      <small>{followUp.role}</small>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="overview-attention-empty">
              Nothing due right now. Schedule a follow-up inside any opportunity
              to see it here.
            </p>
          )}
        </section>

        <div className="overview-grid">
          <section className="workspace-panel" aria-labelledby="recent-heading">
            <div className="workspace-panel-heading">
              <div>
                <p className="overview-eyebrow">YOUR PIPELINE</p>
                <h2 id="recent-heading">Recent opportunities</h2>
              </div>
              <Link to="/opportunities" className="workspace-text-link">
                View all <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {recent.length ? (
              <div className="overview-rows">
                {recent.map((item) => (
                  <OpportunityRow key={item.id} opportunity={item} />
                ))}
              </div>
            ) : (
              <div className="overview-empty">
                <BriefcaseBusiness
                  size={25}
                  strokeWidth={1.4}
                  aria-hidden="true"
                />
                <strong>No opportunities yet</strong>
                <p>
                  Your saved roles will appear here as your search takes shape.
                </p>
              </div>
            )}
          </section>
          <section
            className="workspace-panel overview-guide"
            aria-labelledby="guide-heading"
          >
            <p className="overview-eyebrow">CAREER FOUNDATION</p>
            <h2 id="guide-heading">
              {completion === 100
                ? 'Your profile is ready for intelligence.'
                : 'Give every role better context.'}
            </h2>
            <p>
              CareerOS uses your private profile and skills to explain where a
              role aligns—and where it may stretch you.
            </p>
            <div className="overview-profile-meter">
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="overview-guide-line">
              <span>{completion}%</span>
              <span>Profile foundation complete</span>
            </div>
            <Link to="/profile" className="overview-profile-link">
              {completion ? 'Continue profile' : 'Start career profile'}{' '}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
