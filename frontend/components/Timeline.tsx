import type { FlagType, TimelineEvent } from '@/lib/types';

const FLAG_META: Record<FlagType, { label: string; color: string }> = {
  causation_relevant: {
    label: 'Causation',
    color: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  pre_existing_condition: {
    label: 'Pre-existing',
    color: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
  record_conflict: {
    label: 'Conflict',
    color: 'bg-red-100 text-red-800 border border-red-300',
  },
  treatment_gap: {
    label: 'Gap',
    color: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
};

function FlagBadge({ flag }: { flag: FlagType }) {
  const meta = FLAG_META[flag] ?? { label: flag, color: 'bg-gray-100 text-gray-700 border border-gray-300' };
  return (
    <span className={`inline-block text-xs rounded px-2 py-0.5 font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function EventCard({ event }: { event: TimelineEvent }) {
  return (
    <div className="flex gap-4 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-4">
        <div className="w-3 h-3 rounded-full bg-red-600 mt-1 ring-2 ring-white ring-offset-1" />
        <div className="w-px flex-1 bg-gray-200 mt-1 group-last:hidden" />
      </div>

      {/* Event content */}
      <div className="pb-8 flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1">
          <time className="text-xs font-mono font-semibold text-red-700 tabular-nums">
            {event.event_date}
          </time>
          {event.provider_name && (
            <span className="text-sm text-gray-500 italic truncate">{event.provider_name}</span>
          )}
        </div>

        <p className="text-sm text-gray-800 leading-relaxed mb-2">{event.description}</p>

        {event.citation_text && (
          <blockquote className="border-l-2 border-gray-300 pl-3 mb-2">
            <p className="text-xs text-gray-500 italic leading-relaxed">{event.citation_text}</p>
            {event.source_page != null && (
              <cite className="text-xs text-gray-400 not-italic">p.&nbsp;{event.source_page}</cite>
            )}
          </blockquote>
        )}

        {event.flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.flags.map((f) => (
              <FlagBadge key={f} flag={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TimelineProps {
  events: TimelineEvent[];
}

export default function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No events match the selected filter.
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
