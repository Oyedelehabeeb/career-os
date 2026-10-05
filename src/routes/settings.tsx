import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { PrivacySettings } from '../components/privacy-settings'
import { getCurrentUser } from '../server/auth'
import { getPrivacySummary } from '../server/settings'

export const Route = createFileRoute('/settings')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: () => getPrivacySummary(),
  component: SettingsPage,
  errorComponent: ({ error }) => (
    <main className="workspace-page">
      <h1 className="workspace-page-title">Settings unavailable</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
    </main>
  ),
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const summary = Route.useLoaderData()
  return (
    <AppShell email={user.email}>
      <PrivacySettings email={user.email} resumeCount={summary.resumeCount} />
    </AppShell>
  )
}
