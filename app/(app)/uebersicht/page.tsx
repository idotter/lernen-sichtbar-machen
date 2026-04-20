import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'

export const metadata = { title: 'Übersicht — Lernen sichtbar machen' }

export default async function UebersichtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser || currentUser.role !== 'schulleitung') redirect('/klasse')

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Schulübersicht</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aggregierte Ansicht aller Klassen der Schuleinheit.
          </p>
        </div>
        <div className="bg-lsm-surface rounded-lg border p-8 text-center text-muted-foreground text-sm">
          Die Schulübersicht wird in Epic 6 implementiert.
        </div>
      </div>
    </div>
  )
}
