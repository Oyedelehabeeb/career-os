import { createFileRoute, redirect } from '@tanstack/react-router'

import { AppShell } from '../components/app-shell'
import { OpportunityList } from '../components/opportunity-list'
import { getCurrentUser } from '../server/auth'
import { listOpportunities } from '../server/opportunities'

export const Route = createFileRoute('/opportunities')({
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) throw redirect({ to: '/login' })
    return { user }
  },
  loader: () => listOpportunities(),
  component: OpportunitiesPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-5 py-16 text-[#182d2b]">
      <h1 className="text-2xl font-semibold">Opportunities are unavailable</h1>
      <p className="mt-3 text-sm text-[#52645f]">
        {error instanceof Error ? error.message : 'Please try again.'}
      </p>
      <p className="mt-2 text-sm text-[#52645f]">
        The opportunity database migration may still need to be applied.
      </p>
    </main>
  ),
})

function OpportunitiesPage() {
  const { user } = Route.useRouteContext()
  const opportunities = Route.useLoaderData()
  return (
    <AppShell email={user.email}>
      <OpportunityList opportunities={opportunities} />
    </AppShell>
  )
}
