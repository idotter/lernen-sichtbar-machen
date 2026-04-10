// lib/utils/action-result.ts
// SINGLE SOURCE OF TRUTH für alle Server Action Returns
// Wird in Story 1.4 vollständig implementiert

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
