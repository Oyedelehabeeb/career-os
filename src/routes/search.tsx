import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { WorkspaceSearch } from '../components/workspace-search'
import { getCurrentUser } from '../server/auth'

export const Route = createFileRoute('/search')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  component: SearchPage,
})

function SearchPage() {
  const { user } = Route.useRouteContext()
  return (
    <AppShell email={user.email}>
      <WorkspaceSearch />
    </AppShell>
  )
}
