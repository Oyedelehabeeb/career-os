import {
  CalendarDays,
  CheckCircle2,
  ContactRound,
  History,
  StickyNote,
} from 'lucide-react'

import { buildOpportunityTimeline } from '../lib/opportunity-records'
import type {
  OpportunityRecords,
  TimelineSource,
} from '../lib/opportunity-records'

const icons = {
  status: History,
  contact: ContactRound,
  interview: CalendarDays,
  note: StickyNote,
  follow_up: CheckCircle2,
} as const

export function OpportunityTimeline({
  history,
  followUps,
  records,
}: {
  history: TimelineSource['history']
  followUps: TimelineSource['followUps']
  records: OpportunityRecords
}) {
  const items = buildOpportunityTimeline({ ...records, history, followUps })
  return (
    <aside className="opportunity-timeline" aria-labelledby="activity-heading">
      <div className="timeline-heading">
        <div>
          <p className="overview-eyebrow">ACTIVITY</p>
          <h2 id="activity-heading">Application timeline</h2>
        </div>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        <ol>
          {items.map((item) => {
            const Icon = icons[item.kind]
            return (
              <li key={item.id}>
                <span data-kind={item.kind} aria-hidden="true">
                  <Icon size={13} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <time dateTime={item.occurredAt}>
                    {new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(item.occurredAt))}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="timeline-empty">
          Activity will appear here as the application develops.
        </p>
      )}
    </aside>
  )
}
