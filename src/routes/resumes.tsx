import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { ResumeManager } from '../components/resume-manager'
import { getCurrentUser } from '../server/auth'
import { listResumeVersions } from '../server/resumes'

export const Route = createFileRoute('/resumes')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: () => listResumeVersions(),
  component: ResumesPage,
  errorComponent: ({ error }) => (
    <main className="workspace-page">
      <h1 className="workspace-page-title">Resumes unavailable</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
    </main>
  ),
})

function ResumesPage() {
  const { user } = Route.useRouteContext()
  const resumes = Route.useLoaderData()
  return (
    <AppShell email={user.email}>
      <ResumeManager userId={user.id} resumes={resumes} />
    </AppShell>
  )
}
