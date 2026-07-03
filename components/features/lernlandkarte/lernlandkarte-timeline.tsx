'use client'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { LearningEntry } from '@/lib/db/schema/learning-entries'
import type { Artefact } from '@/lib/db/schema/artefacts'
import { JourneyNode } from './journey-node'
import { AddLernschrittButton } from './add-lernschritt-button'

export type EntryWithArtefacts = LearningEntry & { artefacts: Artefact[] }
export type VorhabenGroup = EntryWithArtefacts & { children: EntryWithArtefacts[] }

interface Props {
  vorhaben: VorhabenGroup[]
}

function firstThumbnail(entry: EntryWithArtefacts): string | undefined {
  return entry.artefacts.find((a) => a.type === 'bild' && a.url)?.url ?? undefined
}

export function LernlandkarteTimeline({ vorhaben }: Props) {
  const lastRef = useRef<HTMLLIElement>(null)
  const lastEntryId = vorhaben[0]?.children.at(-1)?.id ?? vorhaben[0]?.id

  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastEntryId])

  if (vorhaben.length === 0) return null

  return (
    <div className="space-y-8 overflow-x-hidden">
      {vorhaben.map((v) => {
        const isAbgeschlossen = v.status === 'abgeschlossen'
        return (
          <section
            key={v.id}
            aria-label={`Lernvorhaben: ${v.text ?? 'kein Titel'}`}
            className={cn('space-y-2', isAbgeschlossen && 'opacity-50')}
          >
            <div className="flex items-center gap-2">
              {isAbgeschlossen && (
                <span
                  aria-label="Abgeschlossen"
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  ✓ Abgeschlossen
                </span>
              )}
            </div>
            <ol className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-px before:bg-lsm-border">
              <li className="relative">
                <span
                  aria-hidden
                  className="absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-[var(--color-node-frage)] bg-white"
                />
                <JourneyNode entry={v} thumbnailUrl={firstThumbnail(v)} />
              </li>
              {v.children.map((child, idx) => {
                const isLast = idx === v.children.length - 1
                return (
                  <li key={child.id} className="relative" ref={isLast ? lastRef : undefined}>
                    <span
                      aria-hidden
                      className={cn(
                        'absolute -left-6 top-4 h-3 w-3 rounded-full border-2 bg-white',
                        child.type === 'ki_question'
                          ? 'border-dashed border-lsm-border'
                          : 'border-[var(--color-node-schritt)]'
                      )}
                    />
                    <JourneyNode
                      entry={child}
                      thumbnailUrl={firstThumbnail(child)}
                      isNew={isLast}
                    />
                  </li>
                )
              })}
              {!isAbgeschlossen && (
                <li className="relative pt-2">
                  <span
                    aria-hidden
                    className="absolute -left-6 top-5 h-3 w-3 rounded-full border-2 border-dashed border-lsm-border bg-white"
                  />
                  <AddLernschrittButton parentId={v.id} />
                </li>
              )}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
