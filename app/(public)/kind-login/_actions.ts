'use server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  getClassByInviteCode,
  createChild,
  findChildForLogin,
} from '@/lib/db/queries/children'
import {
  hashPin,
  verifyPin,
  createChildSession,
} from '@/lib/auth/children-auth'
import { ok, fail, fromZodError, type ActionResult } from '@/lib/utils/action-result'

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, 'Der Code hat genau 6 Zeichen.')
    .regex(/^[A-Z0-9]+$/, 'Nur Buchstaben und Zahlen erlaubt.'),
})

const registerSchema = codeSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, 'Dein Name braucht mindestens 2 Zeichen.')
    .max(50, 'Maximal 50 Zeichen.'),
  pin: z
    .string()
    .length(4, 'Die PIN hat genau 4 Ziffern.')
    .regex(/^[0-9]+$/, 'Die PIN darf nur aus Ziffern bestehen.'),
})

const loginSchema = registerSchema

// Patch P17: validateInviteCode gibt keinen Klassennamen/classId mehr zurück.
// Nur Boolean-Info «Code gültig» verhindert Enumeration von Klassen/Schulnamen
// durch nicht-authentifizierte Angreifer.
export type ValidateCodeResult = ActionResult<{ valid: true }>
export type KindAuthResult = ActionResult<void>

/**
 * Schritt 1: Kind gibt Einladungscode ein → Code wird validiert.
 * Keine Metadaten werden zurückgegeben (Patch P17: Klassenname-Leak verhindern).
 */
export async function validateInviteCode(
  _prev: ValidateCodeResult | null,
  formData: FormData
): Promise<ValidateCodeResult> {
  const parsed = codeSchema.safeParse({ code: formData.get('code') })
  if (!parsed.success) {
    return fromZodError(parsed.error) as ValidateCodeResult
  }

  const klasse = await getClassByInviteCode(parsed.data.code)
  if (!klasse) {
    return fail('Dieser Code ist ungültig oder abgelaufen.', {
      code: ['Code nicht gefunden.'],
    })
  }

  return ok({ valid: true })
}

/**
 * Schritt 2a: Neues Kind registriert sich mit Code + Name + PIN.
 */
export async function registerChild(
  _prev: KindAuthResult | null,
  formData: FormData
): Promise<KindAuthResult> {
  const parsed = registerSchema.safeParse({
    code: formData.get('code'),
    displayName: formData.get('displayName'),
    pin: formData.get('pin'),
  })
  if (!parsed.success) {
    return fromZodError(parsed.error) as KindAuthResult
  }

  const klasse = await getClassByInviteCode(parsed.data.code)
  if (!klasse) {
    return fail('Code ist ungültig oder abgelaufen.', {
      code: ['Code nicht gefunden.'],
    })
  }

  // Pre-Check: Name bereits in dieser Klasse aktiv (case-insensitiv, Patch P5).
  // Finale Sicherung läuft über Partial-UNIQUE-Index (Migration 0004, Patch P4).
  const existing = await findChildForLogin(klasse.id, parsed.data.displayName)
  if (existing) {
    return fail('Dieser Name ist in deiner Klasse schon vergeben.', {
      displayName: ['Name bereits vergeben. Bitte wähle einen anderen.'],
    })
  }

  let childId: string
  try {
    const pinHash = await hashPin(parsed.data.pin)
    const row = await createChild({
      classId: klasse.id,
      schoolId: klasse.schoolId,
      displayName: parsed.data.displayName,
      pinHash,
    })
    childId = row.id
  } catch (err) {
    // Patch P15: DB-Fehler loggen für Support-Diagnose.
    // Häufigster Fall: 23505 UNIQUE violation (Race vs. Partial-Unique-Index).
    console.error('[registerChild] DB insert failed:', err)
    const code = isUniqueViolation(err) ? 'duplicate_name' : 'db_error'
    if (code === 'duplicate_name') {
      return fail('Dieser Name ist in deiner Klasse schon vergeben.', {
        displayName: ['Name bereits vergeben.'],
      })
    }
    return fail('Registrierung fehlgeschlagen. Bitte erneut versuchen.')
  }

  await issueChildSessionCookie({
    sub: childId,
    role: 'kind',
    schoolId: klasse.schoolId,
    classId: klasse.id,
  })

  redirect('/lernlandkarte')
}

/**
 * Schritt 2b: Bestehendes Kind loggt sich mit Code + Name + PIN ein.
 * Patch P12: Unified Error-Message — «Name nicht gefunden» und «PIN falsch»
 * werden nicht mehr unterscheidbar zurückgegeben (verhindert Namens-Enumeration).
 */
export async function loginChild(
  _prev: KindAuthResult | null,
  formData: FormData
): Promise<KindAuthResult> {
  const parsed = loginSchema.safeParse({
    code: formData.get('code'),
    displayName: formData.get('displayName'),
    pin: formData.get('pin'),
  })
  if (!parsed.success) {
    return fromZodError(parsed.error) as KindAuthResult
  }

  const klasse = await getClassByInviteCode(parsed.data.code)
  if (!klasse) {
    return fail('Code ist ungültig oder abgelaufen.', {
      code: ['Code nicht gefunden.'],
    })
  }

  const child = await findChildForLogin(klasse.id, parsed.data.displayName)

  // Konstant-Zeit-Check: bei fehlendem Kind trotzdem bcrypt-Verify laufen lassen,
  // damit Antwortzeiten nicht «Name existiert?» verraten. Dummy-Hash hat gleichen Cost.
  const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8QbTnx7rp4e.zU03w7K0dKQTOmAEqy'
  const pinOk = child
    ? await verifyPin(parsed.data.pin, child.pinHash)
    : await verifyPin(parsed.data.pin, DUMMY_HASH)

  if (!child || !pinOk) {
    return fail('Name oder PIN stimmt nicht. Bitte erneut versuchen.')
  }

  await issueChildSessionCookie({
    sub: child.id,
    role: 'kind',
    schoolId: child.schoolId,
    classId: child.classId,
  })

  redirect('/lernlandkarte')
}

/**
 * Kind ausloggen — Cookie wird invalidiert.
 */
export async function logoutChild(): Promise<void> {
  const store = await cookies()
  store.delete('child_session')
  redirect('/kind-login')
}

async function issueChildSessionCookie(payload: {
  sub: string
  role: 'kind'
  schoolId: string
  classId: string
}) {
  const token = await createChildSession(payload)
  const cookieStore = await cookies()
  cookieStore.set('child_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Patch P8: strict statt lax — kein legitimer Cross-Site-Flow existiert
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8h (Schultag)
  })
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === '23505'
}
