import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL ist nicht gesetzt. Prüfe die .env Datei.')
}

// PgBouncer transaction mode für Supabase Serverless
// { prepare: false } ist PFLICHT — ohne dies schlägt PgBouncer fehl
// Globaler Singleton verhindert Pool-Erschöpfung bei Next.js Hot-Reload
const globalForDb = global as unknown as { __pgClient?: ReturnType<typeof postgres> }
const client = globalForDb.__pgClient ?? (globalForDb.__pgClient = postgres(process.env.DATABASE_URL, { prepare: false }))

export const db = drizzle(client, { schema })
