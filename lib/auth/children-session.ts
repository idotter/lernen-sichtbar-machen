// Server-side Helper für Kind-Sessions (Server Components + Route Handler).
// Verifiziert JWT + prüft dass Kind in DB noch aktiv ist (isDeleted=false).
//
// Patch P2: Middleware verifiziert nur die JWT-Signatur (Edge Runtime kann kein DB).
// Dieser Helper ergänzt Defense-in-Depth auf Page-Ebene — soft-deleted Kinder
// verlieren SOFORT beim nächsten Request den Zugriff, auch wenn ihr Token noch gültig wäre.
//
// Nutzung in Server Components:
//   const child = await getCurrentChild()
//   if (!child) redirect('/kind-login')
import { cookies } from 'next/headers'
import { verifyChildSession, type ChildJwtPayload } from './children-jwt'
import { getChildById } from '@/lib/db/queries/children'
import type { Child } from '@/lib/db/schema/children'

const CHILD_COOKIE = 'child_session'

export type ChildSession = {
  child: Child
  payload: ChildJwtPayload
}

/**
 * Liest `child_session` Cookie, verifiziert JWT-Signatur UND prüft in DB
 * dass Kind noch existiert und nicht soft-deleted ist. Gibt null zurück
 * wenn irgendein Check fehlschlägt — ruft den Caller dafür, Cookie zu löschen
 * (z.B. via `clearChildSessionCookie()`).
 */
export async function getCurrentChild(): Promise<ChildSession | null> {
  const store = await cookies()
  const token = store.get(CHILD_COOKIE)?.value
  if (!token) return null

  const payload = await verifyChildSession(token)
  if (!payload) return null

  const child = await getChildById(payload.sub)
  if (!child) return null // Kind wurde gelöscht oder existiert nicht (mehr)

  // Tenant-Konsistenz-Check: JWT muss zum aktuellen DB-Stand passen
  if (child.schoolId !== payload.schoolId || child.classId !== payload.classId) {
    return null
  }

  return { child, payload }
}

/**
 * Löscht das `child_session` Cookie (z.B. beim Logout oder wenn Session abgelaufen).
 * Muss in einer Server Action / Route Handler aufgerufen werden.
 */
export async function clearChildSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(CHILD_COOKIE)
}
