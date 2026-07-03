import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'
import {
  countAuditEntries,
  getAuditEntries,
  type AiEventType,
} from '@/lib/db/queries/audit-log'

export const metadata = { title: 'KI-Log — Lernen sichtbar machen' }

const PAGE_SIZE = 25

const EVENT_LABELS: Record<AiEventType, string> = {
  'ai/socratic-question': 'Sokratische Frage',
  'ai/lp21-classification': 'LP21-Klassifizierung',
  'ai/lp21-confirmation': 'LP21 bestätigt',
  'ai/lp21-rejection': 'LP21 abgelehnt',
  'ai/ki-confirmed': 'KI-Vorschlag bestätigt',
  'ai/ki-rejected': 'KI-Vorschlag abgelehnt',
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function isEventType(v: unknown): v is AiEventType {
  return typeof v === 'string' && v in EVENT_LABELS
}

interface Props {
  searchParams: Promise<{ from?: string; to?: string; type?: string; page?: string }>
}

export default async function KILogPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) redirect('/registrierung?error=setup_incomplete')

  const params = await searchParams
  const from = parseDate(params.from)
  const to = parseDate(params.to)
  const eventType = isEventType(params.type) ? params.type : undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [entries, total] = await Promise.all([
    getAuditEntries(currentUser.schoolId, { from, to, eventType, limit: PAGE_SIZE, offset }),
    countAuditEntries(currentUser.schoolId, { from, to, eventType }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">KI-Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Chronologisches Protokoll aller KI-Ereignisse und Entscheidungen (EU AI Act, DSGVO).
          </p>
        </div>

        <form className="flex flex-wrap gap-3 items-end" role="search" aria-label="KI-Log filtern">
          <label className="flex flex-col text-xs">
            Von
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ''}
              className="border rounded px-2 py-1 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col text-xs">
            Bis
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ''}
              className="border rounded px-2 py-1 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col text-xs">
            Art
            <select
              name="type"
              defaultValue={params.type ?? ''}
              className="border rounded px-2 py-1 min-h-[44px]"
            >
              <option value="">Alle</option>
              {Object.entries(EVENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="bg-lsm-action text-white rounded px-4 py-1 min-h-[44px] text-sm font-medium"
          >
            Filtern
          </button>
        </form>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Einträge im gewählten Zeitraum.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Ereignis</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.createdAt).toISOString().slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {EVENT_LABELS[e.eventType as AiEventType] ?? e.eventType}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{e.actorId.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-lsm-action">Payload</summary>
                        <pre className="mt-1 text-[10px] max-w-md overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center gap-2 text-sm">
            {page > 1 && (
              <a
                href={`?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="text-lsm-action hover:underline min-h-[44px] inline-flex items-center"
              >
                ← Zurück
              </a>
            )}
            <span className="text-muted-foreground">
              Seite {page} von {totalPages} · {total} Einträge
            </span>
            {page < totalPages && (
              <a
                href={`?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="text-lsm-action hover:underline min-h-[44px] inline-flex items-center"
              >
                Weiter →
              </a>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
