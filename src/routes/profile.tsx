import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { ProfileEditor } from '../components/profile-editor'
import { getCurrentUser } from '../server/auth'
import { getCareerProfile } from '../server/profile'

export const Route = createFileRoute('/profile')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: () => getCareerProfile(),
  component: ProfilePage,
  errorComponent: ({ error }) => (
    <main className="workspace-page">
      <h1 className="workspace-page-title">Profile unavailable</h1>
      <p role="alert">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
    </main>
  ),
})

function ProfilePage() {
  const { user } = Route.useRouteContext()
  const data = Route.useLoaderData()
  return (
    <AppShell email={user.email}>
      <ProfileEditor profile={data.profile} skills={data.skills} />
    </AppShell>
  )
}
