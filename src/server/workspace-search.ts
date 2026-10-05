import { createServerFn } from '@tanstack/react-start'

import {
  searchWorkspaceRecords,
  workspaceSearchSchema,
} from '../lib/workspace-search'
import { createClient } from '../lib/supabase/server'
import type { OpportunityStatus } from '../lib/opportunity'
import type {
  SearchContactRecord,
  SearchNoteRecord,
  SearchOpportunityRecord,
} from '../lib/workspace-search'

async function requireUser() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims.sub) throw new Error('Please sign in to continue.')
  return supabase
}

export const searchWorkspace = createServerFn({ method: 'GET' })
  .validator((input: unknown) => workspaceSearchSchema.parse(input))
  .handler(async ({ data }) => {
    if (!data.query) return []
    const supabase = await requireUser()
    const [opportunities, contacts, notes] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, company_id, title, location, source, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1000),
      supabase
        .from('contacts')
        .select('id, opportunity_id, name, role, email, notes, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1000),
      supabase
        .from('notes')
        .select('id, opportunity_id, body, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1000),
    ])
    if (opportunities.error) throw new Error('Unable to search opportunities.')
    if (contacts.error) throw new Error('Unable to search contacts.')
    if (notes.error) throw new Error('Unable to search notes.')

    const companyIds = opportunities.data
      .map((item) => item.company_id)
      .filter((id): id is string => Boolean(id))
    const companies = companyIds.length
      ? await supabase.from('companies').select('id, name').in('id', companyIds)
      : { data: [], error: null }
    if (companies.error) throw new Error('Unable to search companies.')

    const companyById = new Map(
      companies.data.map((company) => [company.id, company.name]),
    )
    const opportunityById = new Map(
      opportunities.data.map((opportunity) => [opportunity.id, opportunity]),
    )
    const mappedOpportunities = opportunities.data.map(
      (item): SearchOpportunityRecord => ({
        id: item.id,
        title: item.title,
        companyName: item.company_id
          ? (companyById.get(item.company_id) ?? null)
          : null,
        location: item.location,
        source: item.source,
        status: item.status as OpportunityStatus,
        updatedAt: item.updated_at,
        isSample: item.source === 'CareerOS sample',
      }),
    )
    const mappedContacts = contacts.data.flatMap(
      (item): SearchContactRecord[] => {
        const opportunity = opportunityById.get(item.opportunity_id)
        if (!opportunity) return []
        return [
          {
            id: item.id,
            opportunityId: item.opportunity_id,
            name: item.name,
            role: item.role,
            email: item.email,
            notes: item.notes,
            opportunityTitle: opportunity.title,
            companyName: opportunity.company_id
              ? (companyById.get(opportunity.company_id) ?? null)
              : null,
            updatedAt: item.updated_at,
            isSample: opportunity.source === 'CareerOS sample',
          },
        ]
      },
    )
    const mappedNotes = notes.data.flatMap((item): SearchNoteRecord[] => {
      const opportunity = opportunityById.get(item.opportunity_id)
      if (!opportunity) return []
      return [
        {
          id: item.id,
          opportunityId: item.opportunity_id,
          body: item.body,
          opportunityTitle: opportunity.title,
          companyName: opportunity.company_id
            ? (companyById.get(opportunity.company_id) ?? null)
            : null,
          updatedAt: item.updated_at,
          isSample: opportunity.source === 'CareerOS sample',
        },
      ]
    })

    return searchWorkspaceRecords(
      {
        opportunities: mappedOpportunities,
        contacts: mappedContacts,
        notes: mappedNotes,
      },
      data.query,
    )
  })
