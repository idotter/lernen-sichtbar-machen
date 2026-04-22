'use client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface EinstiegsKarteProps {
  variant: 'frage' | 'bild' | 'auswahl'
}

const KARTE_CONFIG = {
  frage: {
    href: '/lernlandkarte/neu/freitext',
    label: 'Ich habe eine Frage',
    icon: '❓',
    ariaLabel: 'Lernvorhaben mit eigener Frage starten',
  },
  bild: {
    href: '/lernlandkarte/neu/bild',
    label: 'Ich habe etwas gesehen',
    icon: '📷',
    ariaLabel: 'Lernvorhaben mit Bild starten',
  },
  auswahl: {
    href: '/lernlandkarte/neu/auswahl',
    label: 'Zeig mir Ideen',
    icon: '💡',
    ariaLabel: 'Lernvorhaben mit vorgeschlagener Frage starten',
  },
} as const

export function EinstiegsKarte({ variant }: EinstiegsKarteProps) {
  const router = useRouter()
  const config = KARTE_CONFIG[variant]

  return (
    <button
      role="button"
      aria-label={config.ariaLabel}
      onClick={() => router.push(config.href)}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border bg-lsm-surface p-6',
        'min-h-[140px] w-full text-center transition-shadow',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lsm-action',
        'min-h-[44px]'
      )}
    >
      <span className="text-4xl" aria-hidden="true">{config.icon}</span>
      <span className="text-sm font-medium leading-tight">{config.label}</span>
    </button>
  )
}
