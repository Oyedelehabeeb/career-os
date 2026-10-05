import { z } from 'zod'

import type { OpportunityStatus } from './opportunity'

export const workspaceSearchSchema = z.object({
  query: z.string().trim().max(100),
})

export type SearchOpportunityRecord = {
  id: string
  title: string | null
  companyName: string | null
  location: string | null
  source: string | null
  status: OpportunityStatus
  updatedAt: string
  isSample: boolean
}

export type SearchContactRecord = {
  id: string
  opportunityId: string
  name: string
  role: string | null
  email: string | null
  notes: string | null
  opportunityTitle: string | null
  companyName: string | null
  updatedAt: string
  isSample: boolean
}

export type SearchNoteRecord = {
  id: string
  opportunityId: string
  body: string
  opportunityTitle: string | null
  companyName: string | null
  updatedAt: string
  isSample: boolean
}

export type WorkspaceSearchInput = {
  opportunities: SearchOpportunityRecord[]
  contacts: SearchContactRecord[]
  notes: SearchNoteRecord[]
}

export type WorkspaceSearchResult = {
  id: string
  opportunityId: string
  kind: 'opportunity' | 'contact' | 'note'
  title: string
  subtitle: string
  excerpt: string
  updatedAt: string
  isSample: boolean
  score: number
}

function clean(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function excerpt(value: string, max = 170) {
  const text = clean(value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function scoreFields(query: string, fields: Array<string | null | undefined>) {
  const normalized = fields.map((field) => clean(field).toLocaleLowerCase())
  if (normalized.some((field) => field === query)) return 0
  if (normalized.some((field) => field.startsWith(query))) return 1
  if (normalized.some((field) => field.includes(query))) return 2
  return null
}

export function searchWorkspaceRecords(
  input: WorkspaceSearchInput,
  rawQuery: string,
): WorkspaceSearchResult[] {
  const query = clean(rawQuery).toLocaleLowerCase()
  if (!query) return []
  const results: WorkspaceSearchResult[] = []

  for (const opportunity of input.opportunities) {
    const score = scoreFields(query, [
      opportunity.title,
      opportunity.companyName,
      opportunity.location,
      opportunity.source,
      opportunity.status.replace('_', ' '),
    ])
    if (score === null) continue
    results.push({
      id: `opportunity-${opportunity.id}`,
      opportunityId: opportunity.id,
      kind: 'opportunity',
      title: clean(opportunity.title) || 'Untitled role',
      subtitle: clean(opportunity.companyName) || 'Company not set',
      excerpt: [clean(opportunity.location), clean(opportunity.source)]
        .filter(Boolean)
        .join(' · '),
      updatedAt: opportunity.updatedAt,
      isSample: opportunity.isSample,
      score,
    })
  }

  for (const contact of input.contacts) {
    const score = scoreFields(query, [
      contact.name,
      contact.role,
      contact.email,
      contact.notes,
      contact.opportunityTitle,
      contact.companyName,
    ])
    if (score === null) continue
    results.push({
      id: `contact-${contact.id}`,
      opportunityId: contact.opportunityId,
      kind: 'contact',
      title: contact.name,
      subtitle: [
        clean(contact.role) || 'Opportunity contact',
        clean(contact.opportunityTitle) || 'Untitled role',
      ].join(' · '),
      excerpt: excerpt(contact.notes || contact.email || ''),
      updatedAt: contact.updatedAt,
      isSample: contact.isSample,
      score,
    })
  }

  for (const note of input.notes) {
    const score = scoreFields(query, [
      note.body,
      note.opportunityTitle,
      note.companyName,
    ])
    if (score === null) continue
    results.push({
      id: `note-${note.id}`,
      opportunityId: note.opportunityId,
      kind: 'note',
      title: clean(note.opportunityTitle) || 'Untitled role',
      subtitle: clean(note.companyName) || 'Opportunity note',
      excerpt: excerpt(note.body),
      updatedAt: note.updatedAt,
      isSample: note.isSample,
      score,
    })
  }

  const kindOrder = { opportunity: 0, contact: 1, note: 2 }
  return results
    .sort(
      (a, b) =>
        a.score - b.score ||
        kindOrder[a.kind] - kindOrder[b.kind] ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 75)
}
