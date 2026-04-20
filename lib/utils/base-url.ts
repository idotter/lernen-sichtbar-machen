/**
 * Sichere Origin-Bestimmung via Env-Var — nicht manipulierbar durch Client-Header.
 *
 * Reihenfolge:
 *  1. `NEXT_PUBLIC_SITE_URL` (explizit gesetzt, z.B. Production-URL)
 *  2. `VERCEL_URL` (automatisch von Vercel gesetzt im Preview-/Prod-Deploy)
 *  3. `http://localhost:3000` (Dev-Fallback)
 *
 * Gelernt aus Story 2.1 Code Review: niemals `headers().get('origin')` verwenden
 * (spoofbar → Open-Redirect / Phishing in E-Mails).
 *
 * Bugfix Story 2.3 Code Review (P1): Ternär-Operator-Präzedenz war falsch —
 * `A ?? B ? X : Y` parst als `(A ?? B) ? X : Y` und verwarf den `NEXT_PUBLIC_SITE_URL`-Wert.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
