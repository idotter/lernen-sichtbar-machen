import { redirect } from 'next/navigation'
import { getCurrentChild } from '@/lib/auth/children-session'
import { getTimelineWithArtefacts } from '@/lib/db/queries/learning-entries'
import { EinstiegsKarte } from '@/components/features/lernlandkarte/einstiegs-karte'
import { LernlandkarteTimeline } from '@/components/features/lernlandkarte/lernlandkarte-timeline'

export const metadata = { title: 'Lernlandkarte — Lernen sichtbar machen' }

export default async function LernlandkartePage() {
  const childSession = await getCurrentChild()
  if (!childSession) redirect('/kind-login')

  const vorhaben = await getTimelineWithArtefacts(childSession.child.id)
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
          <div className="space-y-6">
            <LernlandkarteTimeline vorhaben={vorhaben} />
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
