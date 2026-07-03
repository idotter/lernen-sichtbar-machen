import { redirect } from 'next/navigation'
import { getCurrentChild } from '@/lib/auth/children-session'
import { getActiveLernvorhaben } from '@/lib/db/queries/learning-entries'
import { EinstiegsKarte } from '@/components/features/lernlandkarte/einstiegs-karte'
import { AddLernschrittButton } from '@/components/features/lernlandkarte/add-lernschritt-button'

export const metadata = { title: 'Lernlandkarte — Lernen sichtbar machen' }

export default async function LernlandkartePage() {
  const childSession = await getCurrentChild()
  if (!childSession) redirect('/kind-login')

  const vorhaben = await getActiveLernvorhaben(childSession.child.id)
  const hasVorhaben = vorhaben.length > 0

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Lernlandkarte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hallo {childSession.child.displayName}!
          </p>
        </div>

        {!hasVorhaben ? (
          // Einstiegs-Screen: 3 gleichwertige Karten (AC1, AC3)
          <section aria-label="Lernvorhaben starten">
            <p className="text-sm text-muted-foreground mb-4">
              Womit möchtest du heute starten?
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <EinstiegsKarte variant="frage" />
              <EinstiegsKarte variant="bild" />
              <EinstiegsKarte variant="auswahl" />
            </div>
          </section>
        ) : (
          // Timeline wird in Story 3.6 implementiert — bis dahin: Liste mit Lernschritt-Button
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Du hast {vorhaben.length} aktives Lernvorhaben.
            </p>
            <ul className="space-y-4">
              {vorhaben.map((v) => (
                <li key={v.id} className="space-y-3 rounded-lg border-2 border-lsm-border bg-lsm-surface p-4">
                  <p className="text-sm font-medium break-words">{v.text ?? '(kein Text)'}</p>
                  <AddLernschrittButton parentId={v.id} />
                </li>
              ))}
            </ul>
            <a
              href="/lernlandkarte/neu"
              className="inline-flex items-center gap-2 text-sm text-lsm-action hover:underline min-h-[44px]"
            >
              + Neues Vorhaben starten
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
