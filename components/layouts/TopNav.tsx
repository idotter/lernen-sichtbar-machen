import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/queries/users'
import { getCurrentChild } from '@/lib/auth/children-session'
import { getClassesBySchool } from '@/lib/db/queries/classes'
import { getNavItems } from '@/lib/navigation/config'
import { MobileNav } from './MobileNav'
import { NavLink } from './NavLink'

async function getTopNavData() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (authUser) {
    // LP oder SL
    const dbUser = await getCurrentUser(authUser.id)
    if (dbUser) {
      let className: string | undefined
      if (dbUser.role === 'lehrperson') {
        const classes = await getClassesBySchool(dbUser.schoolId)
        className = classes[0]?.name
      }
      return {
        role: dbUser.role as 'schulleitung' | 'lehrperson',
        displayName: dbUser.displayName ?? dbUser.email,
        className,
      }
    }
  }

  // Kind-Session (Custom JWT cookie)
  const childSession = await getCurrentChild()
  if (childSession) {
    return {
      role: 'kind' as const,
      displayName: childSession.child.displayName,
      className: undefined,
    }
  }

  return null
}

export async function TopNav() {
  const navData = await getTopNavData()
  if (!navData) return null

  const { role, displayName, className } = navData
  const items = getNavItems(role, className)
  const homeHref = role === 'kind' ? '/lernlandkarte'
    : role === 'lehrperson' ? '/klasse'
    : '/uebersicht'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-lsm-surface">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href={homeHref}
          className="font-semibold text-lsm-action text-sm shrink-0 min-h-[44px] flex items-center"
        >
          Lernen sichtbar
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Hauptnavigation" className="hidden sm:flex items-center gap-1 flex-1">
          {items.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Avatar-Text + Mobile Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[120px]">
            {displayName}
          </span>
          {/* Mobile Hamburger + Sheet (nur < 640px sichtbar) */}
          <MobileNav items={items} displayName={displayName ?? ''} />
        </div>
      </div>
    </header>
  )
}
