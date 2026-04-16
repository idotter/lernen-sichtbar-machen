import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// AppShell: Server Component mit Auth-Guard (Defense-in-Depth hinter Middleware)
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
