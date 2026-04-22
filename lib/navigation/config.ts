export type UserRole = 'schulleitung' | 'lehrperson' | 'kind'

export interface NavItem {
  label: string
  href: string
}

const NAV_CONFIG: Record<UserRole, (className?: string) => NavItem[]> = {
  kind: () => [{ label: 'Lernlandkarte', href: '/lernlandkarte' }],
  lehrperson: (className) => [
    { label: className ? `Klasse ${className}` : 'Klasse', href: '/klasse' },
    { label: 'LP21', href: '/lp21' },
  ],
  schulleitung: () => [
    { label: 'Übersicht', href: '/uebersicht' },
    { label: 'Einstellungen', href: '/einstellungen' },
  ],
}

/**
 * Nav-Items für eine oder mehrere Rollen. Bei mehreren Rollen werden Duplikate
 * (gleiche href) entfernt; Reihenfolge richtet sich nach Rollen-Array-Reihenfolge.
 */
export function getNavItems(roles: UserRole | UserRole[], className?: string): NavItem[] {
  const roleArray = Array.isArray(roles) ? roles : [roles]
  const seen = new Set<string>()
  const items: NavItem[] = []

  for (const role of roleArray) {
    for (const item of NAV_CONFIG[role](className)) {
      if (!seen.has(item.href)) {
        seen.add(item.href)
        items.push(item)
      }
    }
  }
  return items
}
