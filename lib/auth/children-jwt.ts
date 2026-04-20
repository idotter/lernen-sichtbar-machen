// Edge-safe: nur `jose` (Web Crypto API), keine Node-spezifischen Dependencies.
// Wird sowohl in middleware.ts (Edge Runtime) als auch in Server Actions verwendet.
import { SignJWT, jwtVerify } from 'jose'

export type ChildJwtPayload = {
  sub: string // children.id
  role: 'kind'
  schoolId: string
  classId: string
}

const CHILD_JWT_TTL = '8h' // Schultag-Länge

/**
 * Patch P11: Gibt null zurück statt throw wenn Secret fehlt, damit Middleware
 * nicht die ganze App auf 500 wirft. Server Actions, die schreiben wollen
 * (createChildSession), sollen allerdings laut Error klarstellen dass die
 * Umgebung nicht ready ist — deshalb `throwOnMissing`-Flag.
 */
function getJwtSecret(throwOnMissing: boolean): Uint8Array | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    if (throwOnMissing) throw new Error('SUPABASE_JWT_SECRET ist nicht gesetzt.')
    return null
  }
  return new TextEncoder().encode(secret)
}

export async function createChildSession(payload: ChildJwtPayload): Promise<string> {
  const secret = getJwtSecret(true)!
  return new SignJWT({
    role: payload.role,
    school_id: payload.schoolId,
    class_id: payload.classId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer('supabase')
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(CHILD_JWT_TTL)
    .sign(secret)
}

/**
 * Verifiziert einen Child-JWT. Gibt null zurück bei:
 *  - fehlendem Secret (fail-safe für Edge-Middleware, Patch P11)
 *  - ungültiger Signatur / abgelaufen / falschem issuer/audience
 *  - role !== 'kind'
 *  - fehlenden oder nicht-String-Claims (Patch P10: Typ-Härtung)
 */
export async function verifyChildSession(token: string): Promise<ChildJwtPayload | null> {
  const secret = getJwtSecret(false)
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'supabase',
      audience: 'authenticated',
    })

    // Patch P10: Strikte Typ- und Präsenz-Checks — kein blinder `as string`-Cast mehr.
    if (payload.role !== 'kind') return null

    const sub = payload.sub
    const schoolId = payload.school_id
    const classId = payload.class_id

    if (typeof sub !== 'string' || sub.length === 0) return null
    if (typeof schoolId !== 'string' || schoolId.length === 0) return null
    if (typeof classId !== 'string' || classId.length === 0) return null

    return { sub, role: 'kind', schoolId, classId }
  } catch {
    return null
  }
}
