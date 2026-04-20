import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'
import { getClassesBySchool } from '@/lib/db/queries/classes'
import { getChildrenByClass } from '@/lib/db/queries/children'
import { CreateClassForm } from '@/components/features/klasse/CreateClassForm'
import { LpEinladungKlasseForm } from '@/components/features/klasse/LpEinladungKlasseForm'
import { InviteCodeSection } from '@/components/features/klasse/InviteCodeSection'
import { StudentRow } from '@/components/features/klasse/StudentRow'

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

  // Kinder pro Klasse parallel laden
  const classesWithChildren = await Promise.all(
    classList.map(async (c) => ({
      klasse: c,
      children: await getChildrenByClass(c.id),
    }))
  )

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Klasse</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Klassen verwalten, Lernende einladen und weitere Lehrpersonen hinzufügen
          </p>
        </div>

        {classesWithChildren.length === 0 ? (
          <section className="bg-lsm-surface rounded-lg border p-6 space-y-3">
            <h2 className="font-semibold">Meine Klassen</h2>
            <p className="text-sm text-muted-foreground">Noch keine Klasse erstellt.</p>
          </section>
        ) : (
          classesWithChildren.map(({ klasse, children: students }) => (
            <section
              key={klasse.id}
              className="bg-lsm-surface rounded-lg border p-6 space-y-5"
            >
              <div>
                <h2 className="font-semibold text-lg">{klasse.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {students.length === 0
                    ? 'Noch keine Lernenden'
                    : `${students.length} ${students.length === 1 ? 'Lernende/r' : 'Lernende'}`}
                </p>
              </div>

              <InviteCodeSection classId={klasse.id} initialCode={klasse.inviteCode ?? null} />

              {students.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Lernende</h3>
                  <ul className="space-y-2">
                    {students.map((child) => (
                      <StudentRow key={child.id} child={child} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))
        )}

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
