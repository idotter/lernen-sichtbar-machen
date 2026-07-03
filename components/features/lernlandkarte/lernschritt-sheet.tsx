'use client'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LernschrittTextForm } from './lernschritt-text-form'
import { LernschrittFotoForm } from './lernschritt-foto-form'
import { LernschrittLinkForm } from './lernschritt-link-form'

type Tab = 'text' | 'foto' | 'link'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'text', label: 'Text', icon: '✏️' },
  { id: 'foto', label: 'Foto', icon: '📷' },
  { id: 'link', label: 'Link', icon: '🔗' },
]

interface LernschrittSheetProps {
  parentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LernschrittSheet({
  parentId,
  open,
  onOpenChange,
  onSuccess,
}: LernschrittSheetProps) {
  const [tab, setTab] = useState<Tab>('text')

  function handleSuccess() {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-lg sm:mx-auto sm:rounded-t-lg">
        <SheetHeader>
          <SheetTitle>Was hast du gelernt?</SheetTitle>
          <SheetDescription>
            Wähle Text, Foto oder Link zum Dokumentieren.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-4">
          <div role="tablist" aria-label="Lernschritt-Typ" className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 rounded-lg border-2 p-3 min-h-[64px] transition',
                  tab === t.id
                    ? 'border-[var(--color-node-schritt)] bg-[var(--color-node-schritt-bg)]'
                    : 'border-lsm-border bg-lsm-surface hover:bg-muted'
                )}
              >
                <span className="text-2xl" aria-hidden>{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" aria-label={`Lernschritt-Formular: ${tab}`}>
            {tab === 'text' && (
              <LernschrittTextForm parentId={parentId} onSuccess={handleSuccess} />
            )}
            {tab === 'foto' && (
              <LernschrittFotoForm parentId={parentId} onSuccess={handleSuccess} />
            )}
            {tab === 'link' && (
              <LernschrittLinkForm parentId={parentId} onSuccess={handleSuccess} />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
