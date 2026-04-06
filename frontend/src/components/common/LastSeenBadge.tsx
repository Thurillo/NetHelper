import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface LastSeenBadgeProps {
  lastSeen: string | null | undefined
  /** Se true mostra solo il puntino colorato senza testo (per tabelle dense) */
  compact?: boolean
}

type Freshness = 'fresh' | 'recent' | 'stale' | 'old' | 'never'

function getFreshness(lastSeen: string | null | undefined): Freshness {
  if (!lastSeen) return 'never'
  const diff = Date.now() - new Date(lastSeen).getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) return 'fresh'
  if (hours < 24 * 3) return 'recent'
  if (hours < 24 * 14) return 'stale'
  return 'old'
}

const FRESHNESS_CONFIG: Record<Freshness, { dot: string; label: string; title: string }> = {
  fresh:  { dot: 'bg-green-500',  label: 'Recente',    title: 'Scansionato nelle ultime 24 ore' },
  recent: { dot: 'bg-yellow-400', label: 'Qualche giorno fa', title: 'Scansionato negli ultimi 3 giorni' },
  stale:  { dot: 'bg-orange-400', label: 'Non aggiornato', title: 'Scansionato più di 3 giorni fa' },
  old:    { dot: 'bg-red-400',    label: 'Vecchio',    title: 'Scansionato più di 2 settimane fa' },
  never:  { dot: 'bg-gray-300',   label: 'Mai',        title: 'Nessuna scansione registrata' },
}

/** Badge colorato che indica la freschezza dell'ultimo contatto */
const LastSeenBadge: React.FC<LastSeenBadgeProps> = ({ lastSeen, compact = false }) => {
  const freshness = getFreshness(lastSeen)
  const cfg = FRESHNESS_CONFIG[freshness]

  const relativeTime = lastSeen
    ? formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: it })
    : null

  const tooltip = relativeTime ? `${cfg.title}\n${relativeTime}` : cfg.title

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
        title={tooltip}
      />
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={tooltip}
    >
      <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className="text-xs text-gray-600">
        {relativeTime ?? cfg.label}
      </span>
    </span>
  )
}

export default LastSeenBadge
