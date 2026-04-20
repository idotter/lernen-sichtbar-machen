'use server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema/users'
import { getCurrentUser } from '@/lib/db/queries/users'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'
import { getBaseUrl } from '@/lib/utils/base-url'

const einladungSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export type EinladungResult = ActionResult<void>

export async function inviteSchulleitung(
  _prevState: EinladungResult | null,
  formData: FormData
): Promise<EinladungResult> {
  const raw = { email: formData.get('email') }

  const parsed = einladungSchema.safeParse(raw)
  if (!parsed.success) {
    return fromZodError(parsed.error) as EinladungResult
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht eingeloggt.')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) return fail('Kein Benutzerkonto gefunden.')
  if (currentUser.role !== 'schulleitung') return fail('Keine Berechtigung — nur Schulleitungen können einladen.')

  const baseUrl = getBaseUrl()

  const admin = createAdminClient()

  // Schritt 1: User einladen
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/registrierung/callback`,
  })

  if (inviteError || !inviteData.user) {
    return fail('Einladung konnte nicht verschickt werden.')
  }

  // Schritt 2: app_metadata setzen (nur server-seitig schreibbar — sicher gegen Manipulation)
  const { error: metaError } = await admin.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: {
      pendingRole: 'schulleitung',
      schoolId: currentUser.schoolId,
    },
  })

  if (metaError) {
    // Einladung war erfolgreich, aber Metadaten konnten nicht gesetzt werden
    // Auth-User aufräumen damit kein inkonsistenter Zustand entsteht
    await admin.auth.admin.deleteUser(inviteData.user.id)
    return fail('Einladung konnte nicht verschickt werden.')
  }

  return ok(undefined)
}

/**
 * SL lädt eine neue Lehrperson per E-Mail in ihre Schuleinheit ein.
 * Analoger Flow zu inviteSchulleitung, aber mit pendingRole='lehrperson'.
 * Dup-Check: E-Mail darf in derselben Schule nicht bereits vorhanden sein.
 */
export async function inviteLehrperson(
  _prevState: EinladungResult | null,
  formData: FormData
): Promise<EinladungResult> {
  const raw = { email: formData.get('email') }

  const parsed = einladungSchema.safeParse(raw)
  if (!parsed.success) {
    return fromZodError(parsed.error) as EinladungResult
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht eingeloggt.')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) return fail('Kein Benutzerkonto gefunden.')
  if (currentUser.role !== 'schulleitung') return fail('Keine Berechtigung — nur Schulleitungen können einladen.')

  // Dup-Check: E-Mail existiert bereits in derselben Schuleinheit (aktiver User)
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, parsed.data.email),
        eq(users.schoolId, currentUser.schoolId),
        eq(users.isDeleted, false)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return fail('Diese E-Mail-Adresse ist bereits Teil der Schuleinheit.', {
      email: ['Bereits Teil der Schuleinheit.'],
    })
  }

  const baseUrl = getBaseUrl()
  const admin = createAdminClient()

  // Schritt 1: User einladen
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/registrierung/callback`,
  })

  if (inviteError || !inviteData.user) {
    return fail('Einladung konnte nicht verschickt werden.')
  }

  // Schritt 2: app_metadata setzen (pendingRole=lehrperson — nur server-seitig schreibbar)
  const { error: metaError } = await admin.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: {
      pendingRole: 'lehrperson',
      schoolId: currentUser.schoolId,
    },
  })

  if (metaError) {
    // Auth-User aufräumen damit kein inkonsistenter Zustand entsteht
    await admin.auth.admin.deleteUser(inviteData.user.id)
    return fail('Einladung konnte nicht verschickt werden.')
  }

  return ok(undefined)
}
