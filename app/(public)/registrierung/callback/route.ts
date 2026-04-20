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

  // E-Mail-Prüfung — Supabase-User ohne E-Mail ist für diesen Flow ungültig
  const email = authUser.email
  if (!email) {
    await admin.auth.admin.deleteUser(authUser.id)
    return NextResponse.redirect(`${origin}/registrierung?error=missing_email`)
  }

  // Einladungs-Daten aus app_metadata lesen (nur server-seitig schreibbar — sicher)
  const pendingRole = authUser.app_metadata?.pendingRole as string | undefined
  const pendingSchoolId = authUser.app_metadata?.schoolId as string | undefined

  if (pendingRole === 'schulleitung' && pendingSchoolId) {
    // Einladungs-Flow: zweite Schulleitung einer bestehenden Schuleinheit
    try {
      const { error: userInsertError } = await admin.from('users').insert({
        id: authUser.id,
        school_id: pendingSchoolId,
        role: 'schulleitung',
        email,
        display_name: authUser.user_metadata?.displayName ?? email,
      })

      if (userInsertError) {
        await admin.auth.admin.deleteUser(authUser.id)
        return NextResponse.redirect(
          `${origin}/registrierung?error=${encodeURIComponent('Einladung konnte nicht aktiviert werden.')}`
        )
      }
    } catch {
      // Netzwerkfehler oder Admin-Client-Fehler
      await admin.auth.admin.deleteUser(authUser.id)
      return NextResponse.redirect(
        `${origin}/registrierung?error=${encodeURIComponent('Einladung konnte nicht aktiviert werden.')}`
      )
    }

    return NextResponse.redirect(`${origin}/einstellungen`)
  }

  if (pendingRole === 'lehrperson' && pendingSchoolId) {
    // Einladungs-Flow: Lehrperson einer bestehenden Schuleinheit
    try {
      const { error: userInsertError } = await admin.from('users').insert({
        id: authUser.id,
        school_id: pendingSchoolId,
        role: 'lehrperson',
        email,
        display_name: authUser.user_metadata?.displayName ?? email,
      })

      if (userInsertError) {
        await admin.auth.admin.deleteUser(authUser.id)
        return NextResponse.redirect(
          `${origin}/registrierung?error=${encodeURIComponent('Einladung konnte nicht aktiviert werden.')}`
        )
      }
    } catch {
      await admin.auth.admin.deleteUser(authUser.id)
      return NextResponse.redirect(
        `${origin}/registrierung?error=${encodeURIComponent('Einladung konnte nicht aktiviert werden.')}`
      )
    }

    return NextResponse.redirect(`${origin}/klasse`)
  }

  // Neu-Registrierungs-Flow: neue Schuleinheit anlegen
  const schulName = authUser.user_metadata?.schulName as string | undefined
  const displayName = authUser.user_metadata?.displayName as string | undefined

  if (!schulName) {
    await admin.auth.admin.deleteUser(authUser.id)
    return NextResponse.redirect(`${origin}/registrierung?error=missing_school_name`)
  }

  // Transaktion: school_units + users atomar — kein Orphan bei Fehler
  try {
    await db.transaction(async (tx) => {
      const [newSchool] = await tx
        .insert(schoolUnits)
        .values({ name: schulName, curriculumAdapter: 'lp21' })
        .returning({ id: schoolUnits.id })

      await tx.insert(users).values({
        id: authUser.id,
        schoolId: newSchool.id,
        role: 'schulleitung',
        email,
        displayName: displayName ?? email,
      })
    })
  } catch {
    // Transaktion rollback → kein Orphan; Auth-User löschen
    await admin.auth.admin.deleteUser(authUser.id)
    return NextResponse.redirect(
      `${origin}/registrierung?error=${encodeURIComponent('Schuleinheit konnte nicht eingerichtet werden.')}`
    )
  }

  return NextResponse.redirect(`${origin}/einstellungen`)
}
