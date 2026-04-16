'use server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/db/queries/users'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'

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

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/registrierung/callback`,
    data: {
      pendingRole: 'schulleitung',
      schoolId: currentUser.schoolId,
    },
  })

  if (error) {
    return fail('Einladung konnte nicht verschickt werden: ' + error.message)
  }

  return ok(undefined)
}
