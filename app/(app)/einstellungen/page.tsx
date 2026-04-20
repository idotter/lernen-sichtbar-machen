import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'
import { getSchoolUnit } from '@/lib/db/queries/school-units'
import { SlEinladungForm } from '@/components/features/auth/SlEinladungForm'
import { LpEinladungForm } from '@/components/features/auth/LpEinladungForm'

export const metadata = { title: 'Einstellungen — Lernen sichtbar machen' }

const CURRICULUM_ADAPTER_LABELS: Record<string, string> = {
  lp21: 'Lehrplan 21 (CH)',
}

export default async function EinstellungenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Sequentiell: erst User, dann School — vermeidet doppelten DB-Call
  const currentUser = await getCurrentUser(user.id)
  const schoolUnit = currentUser ? await getSchoolUnit(currentUser.schoolId) : null

  if (!currentUser || !schoolUnit) {
    // Sollte nicht vorkommen — Cleanup-Fehler beim Registrierungs-Callback
    redirect('/registrierung?error=setup_incomplete')
  }

  const adapterLabel = CURRICULUM_ADAPTER_LABELS[schoolUnit.curriculumAdapter] ?? schoolUnit.curriculumAdapter

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Schuleinheit und Konto verwalten</p>
        </div>

        {/* Schuleinheits-Info */}
        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Schuleinheit</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{schoolUnit.name}</dd>
            </div>
            {schoolUnit.kanton && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kanton</dt>
                <dd className="font-medium">{schoolUnit.kanton}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Curriculum-Adapter</dt>
              <dd className="font-medium">{adapterLabel}</dd>
            </div>
          </dl>
        </section>

        {/* Mein Konto */}
        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Mein Konto</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Anzeigename</dt>
              <dd className="font-medium">{currentUser.displayName ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">E-Mail</dt>
              <dd className="font-medium">{currentUser.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Rolle</dt>
              <dd className="font-medium capitalize">{currentUser.role}</dd>
            </div>
          </dl>
        </section>

        {/* Zweite SL einladen */}
        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Weitere Schulleitung einladen</h2>
          <p className="text-sm text-muted-foreground">
            Die eingeladene Person erhält eine E-Mail und bekommt nach Annahme Schulleitung-Rechte
            für diese Schuleinheit.
          </p>
          <SlEinladungForm />
        </section>

        {/* Lehrperson einladen */}
        <section className="bg-lsm-surface rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Lehrperson einladen</h2>
          <p className="text-sm text-muted-foreground">
            Die eingeladene Lehrperson erhält eine E-Mail und kann nach Annahme Klassen in dieser
            Schuleinheit erstellen und Lernende verwalten.
          </p>
          <LpEinladungForm />
        </section>
      </div>
    </div>
  )
}
