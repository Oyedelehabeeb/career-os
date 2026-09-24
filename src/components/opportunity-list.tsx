import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowUpRight, BriefcaseBusiness, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

import {
  createOpportunity,
  changeOpportunityStatus,
} from '../server/opportunities'
import { opportunityStatuses, statusLabels } from '../lib/opportunity'
import type { OpportunitySummary, OpportunityStatus } from '../lib/opportunity'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function OpportunityList({
  opportunities,
}: {
  opportunities: OpportunitySummary[]
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = opportunities.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const text =
      `${item.companyName ?? ''} ${item.title ?? ''} ${item.location ?? ''}`.toLowerCase()
    return matchesStatus && text.includes(search.trim().toLowerCase())
  })

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const result = await createOpportunity({
        data: {
          companyName: String(form.get('companyName') ?? ''),
          title: String(form.get('title') ?? ''),
          location: String(form.get('location') ?? ''),
          sourceUrl: String(form.get('sourceUrl') ?? ''),
          jobDescription: String(form.get('jobDescription') ?? ''),
          priority: String(form.get('priority') ?? 'medium') as
            'low' | 'medium' | 'high',
        },
      })
      await router.invalidate()
      await navigate({
        to: '/opportunities/$opportunityId',
        params: { opportunityId: result.id },
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save the opportunity.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleStatus(id: string, status: OpportunityStatus) {
    setError(null)
    try {
      await changeOpportunityStatus({ data: { opportunityId: id, status } })
      await router.invalidate()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update the status.',
      )
    }
  }

  return (
    <main className="workspace-page">
      <div className="workspace-page-topline">
        <span>YOUR PIPELINE</span>
        <span>{opportunities.length} total opportunities</span>
      </div>
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Opportunities</h1>
          <p className="workspace-page-subtitle">
            Every role, conversation, and next step in one place.
          </p>
        </div>
        <a href="#new-opportunity-heading" className="workspace-primary-action">
          <Plus size={17} aria-hidden="true" /> Add opportunity
        </a>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-[#e8babb] bg-[#fff5f4] px-4 py-3 text-sm text-[#9b2c31]"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section
          aria-labelledby="opportunity-list-heading"
          className="min-w-0 overflow-hidden rounded-xl border border-[#e1e7e1] bg-white"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e9eee8] p-5">
            <div>
              <h2
                id="opportunity-list-heading"
                className="text-lg font-semibold tracking-tight text-[#1e382d]"
              >
                Saved roles
              </h2>
              <p className="mt-1 text-xs text-[#8a978e]">
                {opportunities.length} total · newest first
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="sr-only" htmlFor="opportunity-search">
                Search opportunities
              </label>
              <input
                id="opportunity-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search roles or companies"
                className="min-w-0 flex-1 rounded-md border border-[#dce5dd] bg-[#fcfdfa] px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-[#246b59] sm:w-52"
              />
              <label className="sr-only" htmlFor="status-filter">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-[#dce5dd] bg-[#fcfdfa] px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-[#246b59]"
              >
                <option value="all">All statuses</option>
                {opportunityStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {opportunities.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-[#edf3eb] text-[#57816a]">
                <BriefcaseBusiness
                  size={23}
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              </span>
              <h3 className="text-lg font-semibold text-[#284437]">
                Your search starts here.
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-6 text-[#839087]">
                Save a role when you find it. A company name, role, URL, or
                pasted description is enough to get started.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-sm text-[#75857a]">
              <Search
                size={24}
                className="mb-3 text-[#9aada0]"
                aria-hidden="true"
              />
              No opportunities match those filters.
            </div>
          ) : (
            <>
              <ul className="space-y-3 sm:hidden">
                {filtered.map((item) => (
                  <li
                    key={item.id}
                    className="border border-[#dbe3dd] bg-white p-4"
                  >
                    <Link
                      to="/opportunities/$opportunityId"
                      params={{ opportunityId: item.id }}
                      className="font-semibold text-[#16483f]"
                    >
                      {item.title || 'Untitled role'}
                    </Link>
                    {item.isSample && (
                      <span className="ml-2 rounded bg-[#fff3dc] px-2 py-0.5 text-[10px] font-bold text-[#9a6d23]">
                        Sample
                      </span>
                    )}
                    <p className="mt-1 text-sm text-[#52645f]">
                      {item.companyName || 'Company not set'}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label
                        className="sr-only"
                        htmlFor={`mobile-status-${item.id}`}
                      >
                        Status for {item.title || 'untitled role'}
                      </label>
                      <select
                        id={`mobile-status-${item.id}`}
                        value={item.status}
                        onChange={(event) =>
                          void handleStatus(
                            item.id,
                            event.target.value as OpportunityStatus,
                          )
                        }
                        className="rounded border border-[#cbd8d0] bg-white px-2 py-1 text-xs focus-visible:outline-2 focus-visible:outline-[#246b59]"
                      >
                        {opportunityStatuses.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-[#687a73]">
                        {formatDate(item.savedAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <caption className="sr-only">Saved job opportunities</caption>
                  <thead className="bg-[#f8faf6] text-[10px] font-semibold uppercase tracking-[.1em] text-[#839488]">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Opportunity
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Priority
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Saved
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-[#e4ebe5] align-top"
                      >
                        <td className="px-4 py-4">
                          <Link
                            to="/opportunities/$opportunityId"
                            params={{ opportunityId: item.id }}
                            className="font-semibold text-[#234b38] hover:text-[#1b594b]"
                          >
                            {item.title || 'Untitled role'}
                          </Link>
                          {item.isSample && (
                            <span className="ml-2 rounded bg-[#fff3dc] px-2 py-0.5 text-[10px] font-bold text-[#9a6d23]">
                              Sample
                            </span>
                          )}
                          <div className="mt-1 text-xs text-[#87958b]">
                            {item.companyName || 'Company not set'}
                            {item.location ? ` · ${item.location}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <label
                            className="sr-only"
                            htmlFor={`status-${item.id}`}
                          >
                            Status for {item.title || 'untitled role'}
                          </label>
                          <select
                            id={`status-${item.id}`}
                            value={item.status}
                            onChange={(event) =>
                              void handleStatus(
                                item.id,
                                event.target.value as OpportunityStatus,
                              )
                            }
                            className="max-w-32 rounded-md border border-[#dce5dd] bg-[#f8faf6] px-2 py-1 text-xs font-semibold text-[#36644d] focus-visible:outline-2 focus-visible:outline-[#246b59]"
                          >
                            {opportunityStatuses.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 capitalize">
                          {item.priority}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-[#52645f]">
                          {formatDate(item.savedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
        <aside
          className="order-first self-start rounded-xl border border-[#e1e7e1] bg-white p-6 xl:order-last"
          aria-labelledby="new-opportunity-heading"
        >
          <h2
            id="new-opportunity-heading"
            className="text-lg font-semibold tracking-tight text-[#1e382d]"
          >
            Save an opportunity
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#89968c]">
            Fill only what you know now. You can add context later.
          </p>
          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <Field label="Company" name="companyName" placeholder="e.g. Acme" />
            <Field
              label="Role"
              name="title"
              placeholder="e.g. Product designer"
            />
            <Field
              label="Location"
              name="location"
              placeholder="City or remote"
            />
            <Field
              label="Job URL"
              name="sourceUrl"
              placeholder="https://…"
              type="url"
            />
            <div>
              <label htmlFor="priority" className="block text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="mt-1 w-full rounded-md border border-[#cbd8d0] bg-white px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="jobDescription"
                className="block text-sm font-medium"
              >
                Job description
              </label>
              <textarea
                id="jobDescription"
                name="jobDescription"
                rows={5}
                placeholder="Paste the role details here"
                className="mt-1 w-full rounded-md border border-[#cbd8d0] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#246b59]"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1b594b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#124336] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16483f] disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save opportunity'}{' '}
              {!busy && <ArrowUpRight size={16} aria-hidden="true" />}
            </button>
          </form>
        </aside>
      </div>
    </main>
  )
}

function Field({
  label,
  name,
  placeholder,
  type = 'text',
}: {
  label: string
  name: string
  placeholder: string
  type?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-[#cbd8d0] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#246b59]"
      />
    </div>
  )
}
