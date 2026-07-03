import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JourneyNode } from './journey-node'
import type { LearningEntry } from '@/lib/db/schema/learning-entries'

function makeEntry(overrides: Partial<LearningEntry> = {}): LearningEntry {
  return {
    id: 'e1',
    childId: 'c1',
    classId: 'cl1',
    schoolId: 's1',
    type: 'frage',
    status: 'aktiv',
    text: 'Warum?',
    parentId: null,
    reasoning: null,
    kiConfirmedAt: null,
    kiConfirmedBy: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    ...overrides,
  } as LearningEntry
}

describe('JourneyNode', () => {
  it('ki_question ohne Bestätigung ist ki-suggested', () => {
    render(
      <JourneyNode
        entry={makeEntry({ type: 'ki_question', text: 'Was passiert danach?', reasoning: 'Weil Nachdenken hilft.' })}
      />
    )
    const article = screen.getByRole('article')
    expect(article.getAttribute('data-ki-state')).toBe('suggested')
    expect(article.className).toContain('ki-suggested')
  })

  it('ki_question mit kiConfirmedAt ist ki-confirmed', () => {
    render(
      <JourneyNode
        entry={makeEntry({
          type: 'ki_question',
          text: '…',
          reasoning: 'x',
          kiConfirmedAt: new Date(),
        })}
      />
    )
    const article = screen.getByRole('article')
    expect(article.getAttribute('data-ki-state')).toBe('confirmed')
    expect(article.className).toContain('ki-confirmed')
  })

  it('zeigt KIBadge nur bei KI-Varianten mit reasoning', () => {
    render(
      <JourneyNode entry={makeEntry({ type: 'frage', reasoning: 'nicht angezeigt' })} />
    )
    expect(screen.queryByRole('button', { name: /KI/ })).toBeNull()
  })

  it('rendert KIBadge wenn reasoning vorhanden', () => {
    render(
      <JourneyNode
        entry={makeEntry({ type: 'ki_question', reasoning: 'Sokratische Idee' })}
      />
    )
    expect(screen.getByRole('button', { name: /KI-generierter Vorschlag/i })).toBeTruthy()
  })
})
