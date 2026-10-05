import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  ContactRound,
  FileText,
  Search,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { searchWorkspace } from '../server/workspace-search'
import type { WorkspaceSearchResult } from '../lib/workspace-search'

const resultIcons = {
  opportunity: BriefcaseBusiness,
  contact: ContactRound,
  note: FileText,
}

const resultLabels = {
  opportunity: 'Opportunity',
  contact: 'Contact',
  note: 'Note',
}

export function WorkspaceSearch() {
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [results, setResults] = useState<WorkspaceSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearching(true)
    setError(null)
    try {
      const matches = await searchWorkspace({ data: { query: value } })
      setResults(matches)
      setSearchedQuery(value)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to search your workspace.',
      )
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="workspace-page search-page">
      <div className="workspace-page-topline">
        <span>WORKSPACE SEARCH</span>
        <span>Opportunities · contacts · notes</span>
      </div>
      <div className="workspace-page-heading">
        <div>
          <h1 className="workspace-page-title">Find the context you saved.</h1>
          <p className="workspace-page-subtitle">
            Search roles, people, and private notes from one place.
          </p>
        </div>
      </div>

      <form onSubmit={submit} role="search" className="workspace-search-form">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="workspace-search" className="sr-only">
          Search opportunities, contacts, and notes
        </label>
        <input
          id="workspace-search"
          type="search"
          value={query}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try a company, role, person, skill, or note…"
          autoComplete="off"
        />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <p role="alert" className="profile-notice is-error">
          {error}
        </p>
      )}

      {!searchedQuery ? (
        <section className="search-start" aria-label="Search guidance">
          <span aria-hidden="true">
            <Search size={28} strokeWidth={1.5} />
          </span>
          <h2>One search, your whole job search.</h2>
          <p>
            Find an opportunity by company or role, a contact by name or email,
            and any detail you captured in a note.
          </p>
        </section>
      ) : results.length ? (
        <section
          aria-labelledby="search-results-heading"
          className="search-results"
        >
          <div className="search-results-heading">
            <div>
              <p className="overview-eyebrow">MATCHES</p>
              <h2 id="search-results-heading">
                {results.length} result{results.length === 1 ? '' : 's'} for “
                {searchedQuery}”
              </h2>
            </div>
            <span aria-live="polite">Ranked by relevance</span>
          </div>
          <ol className="search-result-list">
            {results.map((result) => {
              const Icon = resultIcons[result.kind]
              return (
                <li key={result.id}>
                  <Link
                    to="/opportunities/$opportunityId"
                    params={{ opportunityId: result.opportunityId }}
                    className="search-result"
                  >
                    <span className="search-result-icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={1.7} />
                    </span>
                    <span className="search-result-copy">
                      <span className="search-result-meta">
                        {resultLabels[result.kind]}
                        {result.isSample && <em>Sample</em>}
                      </span>
                      <strong>{result.title}</strong>
                      <small>{result.subtitle}</small>
                      {result.excerpt && <p>{result.excerpt}</p>}
                    </span>
                    <time dateTime={result.updatedAt}>
                      {new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(result.updatedAt))}
                    </time>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      ) : (
        <section className="search-start" aria-live="polite">
          <span aria-hidden="true">
            <Search size={28} strokeWidth={1.5} />
          </span>
          <h2>No matches for “{searchedQuery}”.</h2>
          <p>Try a shorter phrase, another spelling, or a company name.</p>
        </section>
      )}
    </main>
  )
}
