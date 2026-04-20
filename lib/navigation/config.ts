export type UserRole = 'schulleitung' | 'lehrperson' | 'kind'

export interface NavItem {
  label: string
  href: string
}

export function getNavItems(role: UserRole, className?: string): NavItem[] {
  switch (role) {
    case 'kind':
      return [{ label: 'Lernlandkarte', href: '/lernlandkarte' }]
    case 'lehrperson':
      return [
        { label: className ? `Klasse ${className}` : 'Klasse', href: '/klasse' },
        { label: 'LP21', href: '/lp21' },
      ]
    case 'schulleitung':
      return [
        { label: 'Übersicht', href: '/uebersicht' },
        { label: 'Einstellungen', href: '/einstellungen' },
      ]
  }
}
