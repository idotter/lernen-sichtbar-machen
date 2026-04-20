import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentChild } from '@/lib/auth/children-session'
import { TopNav } from '@/components/layouts/TopNav'

// AppShell: Server Component mit Auth-Guard (Defense-in-Depth hinter Middleware)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Für LP/SL: Supabase-Auth-Check
  if (!user) {
    // Für Kinder: Custom JWT Cookie prüfen
    const childSession = await getCurrentChild()
    if (!childSession) {
      redirect('/login')
    }
  }

  return (
    <div className="min-h-screen bg-lsm-bg flex flex-col">
      <TopNav />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
