import { redirect } from 'next/navigation'
import { getCurrentChild } from '@/lib/auth/children-session'

export const metadata = { title: 'Lernlandkarte — Lernen sichtbar machen' }

export default async function LernlandkartePage() {
  const childSession = await getCurrentChild()
  if (!childSession) redirect('/kind-login')

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Lernlandkarte</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Hallo {childSession.child.displayName}! Hier erscheinen bald deine Lernvorhaben.
          </p>
        </div>
        <div className="bg-lsm-surface rounded-lg border p-8 text-center text-muted-foreground text-sm">
          Deine Lernlandkarte ist noch leer. Starte dein erstes Lernvorhaben!
        </div>
      </div>
    </div>
  )
}
