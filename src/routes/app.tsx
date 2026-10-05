import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Plus,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { statusLabels } from '../lib/opportunity'
import { getCurrentUser } from '../server/auth'
import { listDueFollowUps, listOpportunities } from '../server/opportunities'
import { listUpcomingInterviews } from '../server/opportunity-records'
import { interviewTypeLabels } from '../lib/opportunity-records'
import {
  buildActivePipelineSummary,
  daysSince,
  findStaleOpportunities,
  splitFollowUps,
} from '../lib/dashboard'

export const Route = createFileRoute('/app')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: async () => {
    const [opportunities, followUps, upcomingInterviews] = await Promise.all([
      listOpportunities(),
      listDueFollowUps(),
      listUpcomingInterviews(),
    ])
    return { opportunities, followUps, upcomingInterviews }
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

function FollowUpRow({
  followUp,
  overdue,
}: {
  followUp: {
    id: string
    opportunityId: string
    title: string
    dueAt: string
    role: string
  }
  overdue: boolean
}) {
  return (
    <Link
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
          : new Intl.DateTimeFormat('en-GB', {
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
}

function AppHome() {
  const { user } = Route.useRouteContext()
  const { opportunities, followUps, upcomingInterviews } = Route.useLoaderData()
  const now = new Date()
  const realOpportunities = opportunities.filter((item) => !item.isSample)
  const pipelineSummary = buildActivePipelineSummary(opportunities)
  const activeCount = pipelineSummary.reduce(
    (total, stage) => total + stage.count,
    0,
  )
  const maxStageCount = Math.max(
    1,
    ...pipelineSummary.map((stage) => stage.count),
  )
  const staleOpportunities = findStaleOpportunities(opportunities, now)
  const followUpGroups = splitFollowUps(followUps, now)
  const recent = opportunities.slice(0, 4)
  const nextOpportunityId =
    followUpGroups.overdue[0]?.opportunityId ??
    upcomingInterviews[0]?.opportunityId ??
    staleOpportunities[0]?.id ??
    recent[0]?.id

  return (
    <AppShell email={user.email}>
      <main className="workspace-page">
        <div className="workspace-page-topline">
          <span>WORKSPACE OVERVIEW</span>
          <span>
            {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }).format(
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
              {followUpGroups.overdue.length > 0
                ? `${followUpGroups.overdue.length} overdue ${followUpGroups.overdue.length === 1 ? 'follow-up needs' : 'follow-ups need'} your attention.`
                : upcomingInterviews.length > 0
                  ? 'Prepare for your next conversation.'
                  : staleOpportunities.length > 0
                    ? 'Bring a quiet opportunity back into focus.'
                    : realOpportunities.length === 0
                      ? opportunities.length > 0
                        ? 'Explore your sample workspace.'
                        : 'Start with one opportunity.'
                      : activeCount > 0
                        ? 'Keep your active roles moving.'
                        : 'Your pipeline is ready for a new lead.'}
            </h2>
            <p>
              {followUpGroups.overdue.length > 0
                ? 'Open the oldest follow-up, complete it, or schedule the next action so nothing promising goes quiet.'
                : upcomingInterviews.length > 0
                  ? `Your next interview is ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(upcomingInterviews[0].scheduledAt))}. Review the role and preparation notes before it begins.`
                  : staleOpportunities.length > 0
                    ? `${staleOpportunities[0].title || 'An active role'} has had no update for ${daysSince(staleOpportunities[0].updatedAt, now)} days. Decide whether to follow up, update its stage, or close it.`
                    : realOpportunities.length === 0
                      ? opportunities.length > 0
                        ? 'The example roles show how CareerOS works. They are labeled Sample and excluded from your pipeline metrics.'
                        : 'Save a role you are considering. Even a company name or job link is enough to begin.'
                      : activeCount > 0
                        ? `You have ${activeCount} active ${activeCount === 1 ? 'opportunity' : 'opportunities'}. Review the latest one, update its status, or capture the next role.`
                        : 'Your saved roles are no longer active. Add a new opportunity when you find one worth tracking.'}
            </p>
          </div>
          {nextOpportunityId ? (
            <Link
              to="/opportunities/$opportunityId"
              params={{ opportunityId: nextOpportunityId }}
              className="overview-hero-link"
            >
              {followUpGroups.overdue.length
                ? 'Open overdue action'
                : upcomingInterviews.length
                  ? 'Prepare for interview'
                  : staleOpportunities.length
                    ? 'Review stale role'
                    : realOpportunities.length === 0
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
            value={activeCount}
            detail="Still in motion"
            icon={BriefcaseBusiness}
          />
          <Stat
            label="Overdue follow-ups"
            value={followUpGroups.overdue.length}
            detail="Need action now"
            icon={AlertTriangle}
          />
          <Stat
            label="Upcoming interviews"
            value={upcomingInterviews.length}
            detail="Scheduled ahead"
            icon={CalendarDays}
          />
          <Stat
            label="Stale opportunities"
            value={staleOpportunities.length}
            detail="No update in 14+ days"
            icon={TimerReset}
          />
        </section>

        <div className="overview-attention-grid">
          <section
            className="workspace-panel overview-attention"
            aria-labelledby="followups-heading"
          >
            <div className="workspace-panel-heading">
              <div>
                <p className="overview-eyebrow">WHAT NEEDS ATTENTION</p>
                <h2 id="followups-heading">Follow-ups</h2>
              </div>
            </div>
            {followUps.length ? (
              <div className="overview-followups">
                {followUpGroups.overdue.length > 0 && (
                  <div className="overview-action-group">
                    <p>OVERDUE · {followUpGroups.overdue.length}</p>
                    {followUpGroups.overdue.map((followUp) => (
                      <FollowUpRow
                        key={followUp.id}
                        followUp={followUp}
                        overdue
                      />
                    ))}
                  </div>
                )}
                {followUpGroups.upcoming.length > 0 && (
                  <div className="overview-action-group">
                    <p>UPCOMING · {followUpGroups.upcoming.length}</p>
                    {followUpGroups.upcoming.map((followUp) => (
                      <FollowUpRow
                        key={followUp.id}
                        followUp={followUp}
                        overdue={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="overview-attention-empty">
                Nothing due right now. Schedule a follow-up inside any
                opportunity to see it here.
              </p>
            )}
          </section>

          <section
            className="workspace-panel overview-attention"
            aria-labelledby="interviews-heading"
          >
            <div className="workspace-panel-heading">
              <div>
                <p className="overview-eyebrow">UPCOMING CONVERSATIONS</p>
                <h2 id="interviews-heading">Interviews</h2>
              </div>
              <CalendarDays size={19} aria-hidden="true" />
            </div>
            {upcomingInterviews.length ? (
              <div className="overview-followups">
                {upcomingInterviews.map((interview) => (
                  <Link
                    key={interview.id}
                    to="/opportunities/$opportunityId"
                    params={{ opportunityId: interview.opportunityId }}
                    className="overview-followup"
                  >
                    <time
                      className="overview-followup-date"
                      dateTime={interview.scheduledAt}
                    >
                      {new Intl.DateTimeFormat('en-GB', {
                        month: 'short',
                        day: 'numeric',
                      }).format(new Date(interview.scheduledAt))}
                    </time>
                    <span>
                      <strong>
                        {interviewTypeLabels[interview.interviewType]}
                      </strong>
                      <small>
                        {interview.role}
                        {interview.contactName
                          ? ` · ${interview.contactName}`
                          : ''}{' '}
                        ·{' '}
                        {new Intl.DateTimeFormat('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(interview.scheduledAt))}
                      </small>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="overview-attention-empty">
                No interviews scheduled. Add one inside an opportunity when a
                conversation is booked.
              </p>
            )}
          </section>
        </div>

        <div className="overview-grid">
          <section className="workspace-panel" aria-labelledby="stale-heading">
            <div className="workspace-panel-heading">
              <div>
                <p className="overview-eyebrow">NEEDS A DECISION</p>
                <h2 id="stale-heading">Stale opportunities</h2>
              </div>
              <Link to="/opportunities" className="workspace-text-link">
                View all <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {staleOpportunities.length ? (
              <div className="overview-stale-list">
                {staleOpportunities.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    to="/opportunities/$opportunityId"
                    params={{ opportunityId: item.id }}
                    className="overview-stale-row"
                  >
                    <span className="overview-stale-icon" aria-hidden="true">
                      <TimerReset size={16} />
                    </span>
                    <span>
                      <strong>{item.title || 'Untitled role'}</strong>
                      <small>
                        {item.companyName || 'Company not set'} ·{' '}
                        {statusLabels[item.status]}
                      </small>
                    </span>
                    <span>{daysSince(item.updatedAt, now)} days</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="overview-empty is-healthy">
                <TimerReset size={25} strokeWidth={1.4} aria-hidden="true" />
                <strong>No stale opportunities</strong>
                <p>
                  Active roles updated within the last 14 days are considered
                  current.
                </p>
              </div>
            )}
          </section>
          <section
            className="workspace-panel overview-pipeline-panel"
            aria-labelledby="pipeline-summary-heading"
          >
            <div className="workspace-panel-heading">
              <div>
                <p className="overview-eyebrow">ACTIVE PIPELINE</p>
                <h2 id="pipeline-summary-heading">Where roles stand</h2>
              </div>
              <strong className="overview-pipeline-total">{activeCount}</strong>
            </div>
            {activeCount ? (
              <div className="overview-pipeline-summary">
                {pipelineSummary.map((stage) => (
                  <div key={stage.status} className="overview-pipeline-stage">
                    <div>
                      <span>{statusLabels[stage.status]}</span>
                      <strong>{stage.count}</strong>
                    </div>
                    <span aria-hidden="true">
                      <i
                        style={{
                          width: `${(stage.count / maxStageCount) * 100}%`,
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="overview-attention-empty">
                Add a real opportunity to start measuring your active pipeline.
                Sample roles stay out of your metrics.
              </p>
            )}
            <Link to="/opportunities" className="overview-pipeline-link">
              Open pipeline <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
