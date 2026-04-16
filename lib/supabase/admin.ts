// lib/supabase/admin.ts — NUR server-seitig verwenden (Route Handler, Server Actions)
// NIEMALS in Client Components importieren — umgeht RLS vollständig
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
