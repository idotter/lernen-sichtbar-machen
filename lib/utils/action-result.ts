// lib/utils/action-result.ts
// SINGLE SOURCE OF TRUTH für alle Server Action Returns
// Kein throw für Validierungsfehler — immer ActionResult zurückgeben
import { ZodError } from 'zod'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

// Zod-Validierungsfehler → ActionResult (nie inline flatten())
export function fromZodError(err: ZodError): ActionResult<never> {
  return {
    success: false,
    error: 'Validierungsfehler',
    fieldErrors: err.flatten().fieldErrors as Record<string, string[]>,
  }
}

// Convenience Helper für erfolgreiche Actions
export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

// Convenience Helper für Fehler-Returns
export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, error, fieldErrors }
}
