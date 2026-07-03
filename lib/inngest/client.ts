import { Inngest } from 'inngest'

/**
 * Inngest-Client für EU-Region.
 * `INNGEST_BASE_URL=https://eu.inngest.com` ist Go-Live-Blocker (DSGVO).
 * Event-Typen werden extern via `@/types/events` gepflegt (aktuelle Inngest-4.x
 * API stellt kein `EventSchemas` mehr bereit — Typen liegen im Sender/Handler).
 */
export const inngest = new Inngest({
  id: 'lernen-sichtbar-machen',
  baseUrl: process.env.INNGEST_BASE_URL ?? 'https://eu.inngest.com',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
