import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Database,
  FileText,
  TrendingUp,
} from 'lucide-react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { statusLabels } from '../lib/opportunity'
import { getAnalyticsSnapshot } from '../server/analytics'
import { getCurrentUser } from '../server/auth'

export const Route = createFileRoute('/analytics')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: () => getAnalyticsSnapshot(),
  component: AnalyticsPage,
  errorComponent: ({ error }) => (
    <main className="workspace-page">
      <h1 className="workspace-page-title">Analytics unavailable</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
    </main>
  ),
})

function formatRate(rate: number | null) {
  return rate === null ? '—' : `${rate}%`
}

function formatDays(value: number | null) {
  if (value === null) return '—'
  if (value < 1) return '<1 day'
  return `${value.toFixed(value < 10 ? 1 : 0)} days`
}

function EmptyInsight({ children }: { children: string }) {
  return (
    <div className="analytics-empty">
      <Database size={22} strokeWidth={1.6} aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function AnalyticsPage() {
  const { user } = Route.useRouteContext()
  const analytics = Route.useLoaderData()
  const maxFunnel = Math.max(analytics.funnel[0]?.count ?? 0, 1)
  const maxSkill = Math.max(analytics.skillDemand[0]?.count ?? 0, 1)
  const measuredStages = analytics.timeInStage.filter(
    (stage) => stage.averageDays !== null,
  )
  const maxStageDays = Math.max(
    ...measuredStages.map((stage) => stage.averageDays ?? 0),
    1,
  )
  const applied = analytics.funnel.find((stage) => stage.key === 'applied')!
  const responses = analytics.funnel.find((stage) => stage.key === 'response')!
  const interviews = analytics.funnel.find(
    (stage) => stage.key === 'interview',
  )!

  return (
    <AppShell email={user.email}>
      <main className="workspace-page analytics-page">
        <div className="workspace-page-topline">
          <span>SEARCH INTELLIGENCE</span>
          <span>{analytics.opportunityCount} real opportunities analyzed</span>
        </div>
        <div className="workspace-page-heading">
          <div>
            <h1 className="workspace-page-title">Learn from your search.</h1>
            <p className="workspace-page-subtitle">
              See where momentum builds, what employers ask for, and which
              choices earn responses.
            </p>
          </div>
          <Link to="/opportunities" className="workspace-primary-action">
            Open pipeline <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="analytics-note" role="note">
          <Activity size={18} aria-hidden="true" />
          <p>
            Metrics come from your saved history. Sample roles are excluded, and
            small datasets are shown as directional—not conclusive.
          </p>
        </div>

        <section className="analytics-kpis" aria-label="Conversion overview">
          <article className="analytics-kpi">
            <span>Application → response</span>
            <strong>
              {formatRate(analytics.conversions[1]?.rate ?? null)}
            </strong>
            <small>
              {responses.count} of {applied.count} applications
            </small>
          </article>
          <article className="analytics-kpi">
            <span>Response → interview</span>
            <strong>
              {formatRate(analytics.conversions[2]?.rate ?? null)}
            </strong>
            <small>
              {interviews.count} of {responses.count} responses
            </small>
          </article>
          <article className="analytics-kpi">
            <span>Average response time</span>
            <strong>{formatDays(analytics.responseTiming.averageDays)}</strong>
            <small>
              {analytics.responseTiming.sampleSize
                ? `${analytics.responseTiming.sampleSize} measured response${analytics.responseTiming.sampleSize === 1 ? '' : 's'}`
                : 'No response timing yet'}
            </small>
          </article>
          <article className="analytics-kpi">
            <span>Roles with skill data</span>
            <strong>{analytics.analyzedOpportunityCount}</strong>
            <small>Parsed job descriptions</small>
          </article>
        </section>

        <div className="analytics-primary-grid">
          <section className="analytics-panel" aria-labelledby="funnel-heading">
            <div className="analytics-panel-heading">
              <div>
                <p className="overview-eyebrow">APPLICATION FUNNEL</p>
                <h2 id="funnel-heading">Progress through the search</h2>
              </div>
              <TrendingUp size={20} aria-hidden="true" />
            </div>
            {analytics.opportunityCount ? (
              <div className="analytics-funnel">
                {analytics.funnel.map((stage, index) => (
                  <div className="analytics-funnel-row" key={stage.key}>
                    <div>
                      <span>{stage.label}</span>
                      <strong>{stage.count}</strong>
                    </div>
                    <span className="analytics-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${Math.max((stage.count / maxFunnel) * 100, stage.count ? 4 : 0)}%`,
                        }}
                      />
                    </span>
                    {index > 0 && (
                      <small>
                        {formatRate(
                          analytics.conversions[index - 1]?.rate ?? null,
                        )}
                        {' from '}
                        {analytics.funnel[index - 1].label.toLowerCase()}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyInsight>
                Add real opportunities and move them through the pipeline to
                build your funnel.
              </EmptyInsight>
            )}
            <p className="analytics-definition">
              A response is the first screening, interview, later-stage, offer,
              or rejection event after applying.
            </p>
          </section>

          <section className="analytics-panel" aria-labelledby="timing-heading">
            <div className="analytics-panel-heading">
              <div>
                <p className="overview-eyebrow">TIME IN STAGE</p>
                <h2 id="timing-heading">Where momentum slows</h2>
              </div>
              <Clock3 size={20} aria-hidden="true" />
            </div>
            {measuredStages.length ? (
              <div className="analytics-stage-times">
                {measuredStages.map((stage) => (
                  <div key={stage.status} className="analytics-stage-time">
                    <div>
                      <span>{statusLabels[stage.status]}</span>
                      <strong>{formatDays(stage.averageDays)}</strong>
                    </div>
                    <span className="analytics-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${((stage.averageDays ?? 0) / maxStageDays) * 100}%`,
                        }}
                      />
                    </span>
                    <small>
                      {stage.sampleSize} role{stage.sampleSize === 1 ? '' : 's'}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyInsight>
                Stage timing appears after real opportunities spend time in the
                pipeline.
              </EmptyInsight>
            )}
            <p className="analytics-definition">
              Averages include time in each role’s current active stage and
              update as its history grows.
            </p>
          </section>
        </div>

        <section
          className="analytics-panel analytics-wide"
          aria-labelledby="source-heading"
        >
          <div className="analytics-panel-heading">
            <div>
              <p className="overview-eyebrow">SOURCE PERFORMANCE</p>
              <h2 id="source-heading">Where opportunities pay off</h2>
            </div>
            <BriefcaseBusiness size={20} aria-hidden="true" />
          </div>
          {analytics.sourcePerformance.length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-table">
                <caption className="sr-only">
                  Performance by opportunity source
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Saved</th>
                    <th scope="col">Applied</th>
                    <th scope="col">Responses</th>
                    <th scope="col">Interviews</th>
                    <th scope="col">Response rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.sourcePerformance.map((source) => (
                    <tr key={source.label}>
                      <th scope="row">{source.label}</th>
                      <td>{source.saved}</td>
                      <td>{source.applied}</td>
                      <td>{source.responses}</td>
                      <td>{source.interviews}</td>
                      <td>
                        <strong>{formatRate(source.responseRate)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyInsight>
              Source performance appears after you save a real opportunity.
            </EmptyInsight>
          )}
        </section>

        <div className="analytics-secondary-grid">
          <section
            className="analytics-panel"
            aria-labelledby="resume-performance-heading"
          >
            <div className="analytics-panel-heading">
              <div>
                <p className="overview-eyebrow">RESUME PERFORMANCE</p>
                <h2 id="resume-performance-heading">
                  Versions earning attention
                </h2>
              </div>
              <FileText size={20} aria-hidden="true" />
            </div>
            {analytics.resumePerformance.length ? (
              <div className="analytics-compact-list">
                {analytics.resumePerformance.map((resume) => (
                  <div key={resume.label} className="analytics-compact-row">
                    <div>
                      <strong>{resume.label}</strong>
                      <small>
                        {resume.applied} application
                        {resume.applied === 1 ? '' : 's'} · {resume.interviews}{' '}
                        interview{resume.interviews === 1 ? '' : 's'}
                      </small>
                    </div>
                    <span>
                      {formatRate(resume.responseRate)}
                      <small>response</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyInsight>
                Attach a resume version to an applied opportunity to compare
                performance.
              </EmptyInsight>
            )}
            <p className="analytics-definition">
              This is association, not proof that a resume caused the result.
            </p>
          </section>

          <section className="analytics-panel" aria-labelledby="skills-heading">
            <div className="analytics-panel-heading">
              <div>
                <p className="overview-eyebrow">SKILL DEMAND</p>
                <h2 id="skills-heading">What employers repeat</h2>
              </div>
              <BarChart3 size={20} aria-hidden="true" />
            </div>
            {analytics.skillDemand.length ? (
              <div className="analytics-skills">
                {analytics.skillDemand.slice(0, 10).map((skill) => (
                  <div key={skill.label} className="analytics-skill">
                    <div>
                      <span>{skill.label}</span>
                      <strong>{skill.frequency}%</strong>
                    </div>
                    <span className="analytics-track" aria-hidden="true">
                      <i
                        style={{ width: `${(skill.count / maxSkill) * 100}%` }}
                      />
                    </span>
                    <small>
                      {skill.count} of {analytics.analyzedOpportunityCount}{' '}
                      roles
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyInsight>
                Parse job descriptions to see recurring skills across your
                target market.
              </EmptyInsight>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  )
}
