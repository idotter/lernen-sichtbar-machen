// Stub — wird in Story 3.3 vollständig implementiert
import { redirect } from 'next/navigation'
import { getCurrentChild } from '@/lib/auth/children-session'

export const metadata = { title: 'Bild aufnehmen — Lernlandkarte' }

export default async function BildPage() {
  const childSession = await getCurrentChild()
  if (!childSession) redirect('/kind-login')

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Was hast du gesehen?</h1>
        <p className="text-muted-foreground text-sm">Bild-Einstieg (wird in Story 3.3 implementiert)</p>
      </div>
    </div>
  )
}
