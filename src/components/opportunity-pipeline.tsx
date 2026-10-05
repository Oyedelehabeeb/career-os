import { useState } from 'react'
import type { DragEvent } from 'react'
import { ArrowUpRight, BriefcaseBusiness, MapPin } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import {
  groupOpportunitiesByStatus,
  opportunityStatuses,
  statusLabels,
} from '../lib/opportunity'
import type { OpportunityStatus, OpportunitySummary } from '../lib/opportunity'

const terminalStatuses = new Set<OpportunityStatus>([
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
  'closed',
])

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function OpportunityPipeline({
  opportunities,
  movingId,
  onMove,
}: {
  opportunities: OpportunitySummary[]
  movingId: string | null
  onMove: (id: string, status: OpportunityStatus) => Promise<boolean>
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<OpportunityStatus | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const grouped = groupOpportunitiesByStatus(opportunities)

  async function move(id: string, status: OpportunityStatus) {
    const opportunity = opportunities.find((item) => item.id === id)
    if (!opportunity || opportunity.status === status) return
    const moved = await onMove(id, status)
    if (moved)
      setAnnouncement(
        `${opportunity.title || 'Untitled role'} moved to ${statusLabels[status]}.`,
      )
  }

  function handleDragStart(
    event: DragEvent<HTMLElement>,
    opportunityId: string,
  ) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', opportunityId)
    setDraggedId(opportunityId)
  }

  function handleDrop(
    event: DragEvent<HTMLElement>,
    status: OpportunityStatus,
  ) {
    event.preventDefault()
    const opportunityId = event.dataTransfer.getData('text/plain') || draggedId
    setDraggedId(null)
    setDropTarget(null)
    if (opportunityId) void move(opportunityId, status)
  }

  return (
    <div className="opportunity-pipeline-shell">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <div
        className="opportunity-pipeline"
        role="region"
        aria-label="Opportunity pipeline"
      >
        {opportunityStatuses.map((status) => (
          <section
            key={status}
            className={`pipeline-column${dropTarget === status ? ' is-drop-target' : ''}`}
            data-terminal={terminalStatuses.has(status) || undefined}
            aria-labelledby={`pipeline-${status}`}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTarget(status)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setDropTarget(null)
            }}
            onDrop={(event) => handleDrop(event, status)}
          >
            <div className="pipeline-column-heading">
              <div>
                <span className="pipeline-status-dot" data-status={status} />
                <h3 id={`pipeline-${status}`}>{statusLabels[status]}</h3>
              </div>
              <span aria-label={`${grouped[status].length} opportunities`}>
                {grouped[status].length}
              </span>
            </div>

            <div className="pipeline-card-list">
              {grouped[status].map((item) => (
                <article
                  key={item.id}
                  className={`pipeline-card${draggedId === item.id ? ' is-dragging' : ''}`}
                  draggable={movingId !== item.id}
                  onDragStart={(event) => handleDragStart(event, item.id)}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDropTarget(null)
                  }}
                >
                  <div className="pipeline-card-topline">
                    <span data-priority={item.priority}>{item.priority}</span>
                    <time dateTime={item.savedAt}>
                      {formatDate(item.savedAt)}
                    </time>
                  </div>
                  <Link
                    to="/opportunities/$opportunityId"
                    params={{ opportunityId: item.id }}
                    className="pipeline-card-link"
                  >
                    <strong>{item.title || 'Untitled role'}</strong>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                  <p>{item.companyName || 'Company not set'}</p>
                  {item.location && (
                    <p className="pipeline-card-location">
                      <MapPin size={12} aria-hidden="true" /> {item.location}
                    </p>
                  )}
                  {item.isSample && (
                    <span className="pipeline-sample">Sample opportunity</span>
                  )}
                  <label htmlFor={`pipeline-move-${item.id}`}>
                    Move to stage
                  </label>
                  <select
                    id={`pipeline-move-${item.id}`}
                    value={item.status}
                    disabled={movingId === item.id}
                    onChange={(event) =>
                      void move(
                        item.id,
                        event.target.value as OpportunityStatus,
                      )
                    }
                  >
                    {opportunityStatuses.map((option) => (
                      <option key={option} value={option}>
                        {statusLabels[option]}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
              {!grouped[status].length && (
                <div className="pipeline-column-empty">
                  <BriefcaseBusiness size={17} aria-hidden="true" />
                  <span>
                    {draggedId ? `Move to ${statusLabels[status]}` : 'No roles'}
                  </span>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="pipeline-scroll-hint">
        Scroll sideways to see every stage. Drag cards or use “Move to stage”.
      </p>
    </div>
  )
}
