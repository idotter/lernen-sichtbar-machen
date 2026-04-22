// Stub — wird in Story 3.2 vollständig implementiert
import { redirect } from 'next/navigation'
import { getCurrentChild } from '@/lib/auth/children-session'

export const metadata = { title: 'Frage stellen — Lernlandkarte' }

export default async function FreitextPage() {
  const childSession = await getCurrentChild()
  if (!childSession) redirect('/kind-login')

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Was beschäftigt dich?</h1>
        <p className="text-muted-foreground text-sm">Freitext-Einstieg (wird in Story 3.2 implementiert)</p>
      </div>
    </div>
  )
}
