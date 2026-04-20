import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'
import { getClassesBySchool } from '@/lib/db/queries/classes'
import { CreateClassForm } from '@/components/features/klasse/CreateClassForm'
import { LpEinladungKlasseForm } from '@/components/features/klasse/LpEinladungKlasseForm'

export const metadata = { title: 'Klasse — Lernen sichtbar machen' }

export default async function KlassePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) {
    redirect('/registrierung?error=setup_incomplete')
  }

  const classList = await getClassesBySchool(currentUser.schoolId)

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Klasse</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Klassen verwalten und weitere Lehrpersonen einladen
          </p>
        </div>

        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Meine Klassen</h2>
          {classList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Klasse erstellt.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {classList.map((c) => (
                <li key={c.id} className="flex justify-between rounded-md border p-3">
                  <span className="font-medium">{c.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Neue Klasse erstellen</h2>
          <CreateClassForm />
        </section>

        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Weitere Lehrperson einladen</h2>
          <p className="text-sm text-muted-foreground">
            Die eingeladene Lehrperson erhält automatisch Zugriff auf alle Klassen der Schuleinheit.
          </p>
          <LpEinladungKlasseForm />
        </section>
      </div>
    </div>
  )
}
