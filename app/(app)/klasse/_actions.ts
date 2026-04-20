'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema/users'
import { classes } from '@/lib/db/schema/classes'
import { children } from '@/lib/db/schema/children'
import { getCurrentUser } from '@/lib/db/queries/users'
import { getClassById, createClass as dbCreateClass } from '@/lib/db/queries/classes'
import { getChildById } from '@/lib/db/queries/children'
import { generateInviteCode as genCode } from '@/lib/auth/children-auth'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'
import { getBaseUrl } from '@/lib/utils/base-url'

const createClassSchema = z.object({
  name: z.string().trim().min(2, 'Klassenname muss mindestens 2 Zeichen lang sein.').max(100, 'Maximal 100 Zeichen erlaubt.'),
})

const einladungSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export type CreateClassResult = ActionResult<{ id: string }>
export type EinladungResult = ActionResult<void>
export type GenerateInviteCodeResult = ActionResult<{ code: string }>
export type ResetPinResult = ActionResult<void>

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

/**
 * LP generiert/regeneriert einen 6-stelligen Einladungscode für eine Klasse.
 * Kinder nutzen diesen Code auf `/kind-login` zur Erst-Registrierung.
 * Bei Regeneration: alter Code wird ungültig, bereits registrierte Kinder sind nicht betroffen
 * (ihre Auth läuft über PIN, nicht über Code).
 *
 * Collision-Handling: UNIQUE-Constraint auf classes.invite_code. Bei Kollision
 * (sehr unwahrscheinlich, ~1/10^9) wird mit neuem Code erneut versucht (max. 5 Versuche).
 */
export async function generateInviteCode(classId: string): Promise<GenerateInviteCodeResult> {
  if (!classId || typeof classId !== 'string') {
    return fail('Ungültige Klassen-ID.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht eingeloggt.')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) return fail('Kein Benutzerkonto gefunden.')
  if (currentUser.role !== 'lehrperson' && currentUser.role !== 'schulleitung') {
    return fail('Keine Berechtigung.')
  }

  // Klasse prüfen + gleiche Schule verifizieren
  const klasse = await getClassById(classId)
  if (!klasse) return fail('Klasse nicht gefunden.')
  if (klasse.schoolId !== currentUser.schoolId) return fail('Keine Berechtigung.')

  // Code generieren — bei echter UNIQUE-Kollision bis zu 5 Mal neu versuchen.
  // Patch P13: Catch auf Postgres-Unique-Violation (23505) einschränken, damit
  // Netzwerk-/Permission-Fehler nicht stillschweigend 5× retried und dann generisch failen.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode()
    try {
      const [row] = await db
        .update(classes)
        .set({ inviteCode: code })
        .where(eq(classes.id, classId))
        .returning({ inviteCode: classes.inviteCode })

      if (row?.inviteCode === code) {
        // Patch P14: revalidatePath('/klasse/${classId}') entfernt — Route existiert nicht.
        revalidatePath('/klasse')
        return ok({ code })
      }
    } catch (err) {
      if (isUniqueViolation(err)) {
        continue // erneut mit neuem Code probieren
      }
      console.error('[generateInviteCode] DB update failed:', err)
      return fail('Einladungscode konnte nicht erzeugt werden. Bitte erneut versuchen.')
    }
  }

  return fail('Einladungscode konnte nicht erzeugt werden. Bitte erneut versuchen.')
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505'
}

/**
 * LP setzt PIN eines Kindes zurück — Soft-Delete des Kindes.
 * Kind kann sich mit dem aktuellen Klassen-Einladungscode erneut registrieren
 * (neuer Anzeigename + neue PIN). So bleibt kein verwaister `supabase_user_id`-Eintrag
 * im Auth-System, und keine alte Session ist weiterhin gültig.
 *
 * Alternative ginge: nur `pinHash` auf einen Dummy setzen, dann kann Kind selbes
 * Profil behalten. Für MVP aber der einfachere Ansatz (Kind trägt Name neu ein).
 */
export async function resetChildPin(childId: string): Promise<ResetPinResult> {
  if (!childId || typeof childId !== 'string') {
    return fail('Ungültige Kind-ID.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Nicht eingeloggt.')

  const currentUser = await getCurrentUser(user.id)
  if (!currentUser) return fail('Kein Benutzerkonto gefunden.')
  if (currentUser.role !== 'lehrperson' && currentUser.role !== 'schulleitung') {
    return fail('Keine Berechtigung.')
  }

  const child = await getChildById(childId)
  if (!child) return fail('Kind nicht gefunden.')
  if (child.schoolId !== currentUser.schoolId) return fail('Keine Berechtigung.')

  try {
    await db
      .update(children)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(children.id, childId))

    // Patch P14: revalidatePath('/klasse/${child.classId}') entfernt — Route existiert nicht.
    revalidatePath('/klasse')
    return ok(undefined)
  } catch (err) {
    console.error('[resetChildPin] DB update failed:', err)
    return fail('PIN konnte nicht zurückgesetzt werden.')
  }
}

