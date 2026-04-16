import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db/client'
import { schoolUnits } from '@/lib/db/schema/school-units'
import { users } from '@/lib/db/schema/users'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/registrierung?error=missing_code`)
  }

  const supabase = await createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !sessionData.user) {
    return NextResponse.redirect(
      `${origin}/registrierung?error=${encodeURIComponent(sessionError?.message ?? 'session_error')}`
    )
  }

  const authUser = sessionData.user
  const admin = createAdminClient()

  // Prüfen ob es eine Einladung (zweite SL) oder eine Neu-Registrierung ist
  const pendingRole = authUser.user_metadata?.pendingRole as string | undefined
  const pendingSchoolId = authUser.user_metadata?.schoolId as string | undefined

  if (pendingRole === 'schulleitung' && pendingSchoolId) {
    // Einladungs-Flow: zweite Schulleitung einer bestehenden Schuleinheit
    const { error: userInsertError } = await admin.from('users').insert({
      id: authUser.id,
      school_id: pendingSchoolId,
      role: 'schulleitung',
      email: authUser.email!,
      display_name: authUser.user_metadata?.displayName ?? authUser.email,
    })

    if (userInsertError) {
      // Cleanup: Auth-User löschen wenn DB-Insert fehlschlägt
      await admin.auth.admin.deleteUser(authUser.id)
      return NextResponse.redirect(
        `${origin}/registrierung?error=${encodeURIComponent('Einladung konnte nicht aktiviert werden: ' + userInsertError.message)}`
      )
    }

    return NextResponse.redirect(`${origin}/einstellungen`)
  }

  // Neu-Registrierungs-Flow: neue Schuleinheit anlegen
  const schulName = authUser.user_metadata?.schulName as string | undefined
  const displayName = authUser.user_metadata?.displayName as string | undefined

  if (!schulName) {
    await admin.auth.admin.deleteUser(authUser.id)
    return NextResponse.redirect(`${origin}/registrierung?error=missing_school_name`)
  }

  // Transaktion: school_units → users (via Admin-Client, umgeht RLS)
  let schoolId: string
  try {
    const [newSchool] = await db
      .insert(schoolUnits)
      .values({ name: schulName, curriculumAdapter: 'lp21' })
      .returning({ id: schoolUnits.id })

    schoolId = newSchool.id

    await db.insert(users).values({
      id: authUser.id,
      schoolId,
      role: 'schulleitung',
      email: authUser.email!,
      displayName: displayName ?? authUser.email,
    })
  } catch (dbError) {
    // Cleanup: Auth-User löschen wenn DB-Setup fehlschlägt
    await admin.auth.admin.deleteUser(authUser.id)
    const msg = dbError instanceof Error ? dbError.message : 'setup_failed'
    return NextResponse.redirect(
      `${origin}/registrierung?error=${encodeURIComponent('Schuleinheit konnte nicht eingerichtet werden: ' + msg)}`
    )
  }

  return NextResponse.redirect(`${origin}/einstellungen`)
}
