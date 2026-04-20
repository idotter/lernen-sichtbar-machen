'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema/users'
import { getCurrentUser } from '@/lib/db/queries/users'
import { createClass as dbCreateClass } from '@/lib/db/queries/classes'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'

const createClassSchema = z.object({
  name: z.string().trim().min(2, 'Klassenname muss mindestens 2 Zeichen lang sein.').max(100, 'Maximal 100 Zeichen erlaubt.'),
})

const einladungSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export type CreateClassResult = ActionResult<{ id: string }>
export type EinladungResult = ActionResult<void>

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Lehrperson (oder SL) legt eine neue Klasse in ihrer Schuleinheit an.
 * RLS `classes_school_isolation` stellt sicher, dass nur User derselben
 * Schule die Klasse sehen können.
 */
export async function createClass(
  _prevState: CreateClassResult | null,
  formData: FormData
): Promise<CreateClassResult> {
  const raw = { name: formData.get('name') }

  const parsed = createClassSchema.safeParse(raw)
  if (!parsed.success) {
    return fromZodError(parsed.error) as CreateClassResult
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht eingeloggt.')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) return fail('Kein Benutzerkonto gefunden.')

  try {
    const row = await dbCreateClass(currentUser.schoolId, parsed.data.name)
    revalidatePath('/klasse')
    return ok({ id: row.id })
  } catch {
    return fail('Klasse konnte nicht angelegt werden.')
  }
}

/**
 * LP oder SL lädt eine weitere Lehrperson per E-Mail zur Schuleinheit ein.
 * Dadurch erhält die eingeladene Person über School-Level RLS Zugriff auf
 * alle Klassen derselben Schule (inkl. der Klasse, aus deren Kontext
 * eingeladen wurde).
 */
export async function inviteLehrpersonToClass(
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
  if (currentUser.role !== 'lehrperson' && currentUser.role !== 'schulleitung') {
    return fail('Keine Berechtigung.')
  }

  // Dup-Check: E-Mail in derselben Schuleinheit bereits aktiv?
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

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/registrierung/callback`,
  })

  if (inviteError || !inviteData.user) {
    return fail('Einladung konnte nicht verschickt werden.')
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: {
      pendingRole: 'lehrperson',
      schoolId: currentUser.schoolId,
    },
  })

  if (metaError) {
    await admin.auth.admin.deleteUser(inviteData.user.id)
    return fail('Einladung konnte nicht verschickt werden.')
  }

  return ok(undefined)
}
