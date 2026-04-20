// Node-only Module (bcryptjs) für PIN-Hashing und Code-Generierung.
// JWT-Funktionen sind in ./children-jwt.ts (edge-safe) ausgelagert.
import bcrypt from 'bcryptjs'

export { createChildSession, verifyChildSession } from './children-jwt'
export type { ChildJwtPayload } from './children-jwt'

/**
 * PIN-Hashing mit bcrypt (salt rounds = 10).
 * Pflicht: Niemals Plaintext speichern (NFR11).
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Einladungscode generieren — 6-stellig, alphanumerisch, ohne verwechselbare Zeichen
 * (0/O, 1/I/l). Kollisionscheck erfolgt auf DB-Ebene (UNIQUE constraint).
 */
const INVITE_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes).map((b) => INVITE_CODE_CHARSET[b % INVITE_CODE_CHARSET.length]).join('')
}
