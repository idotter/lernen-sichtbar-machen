import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema/index.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // DIRECT_URL (Port 5432) — kein PgBouncer für drizzle-kit Migrationen
    url: process.env.DIRECT_URL!,
  },
} satisfies Config
