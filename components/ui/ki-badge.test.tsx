import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KIBadge } from './ki-badge'

describe('KIBadge', () => {
  it('rendert KI-Trigger mit ARIA-Label', () => {
    render(<KIBadge reasoning="Weil Vergleiche helfen." />)
    const trigger = screen.getByRole('button', { name: /KI-generierter Vorschlag/i })
    expect(trigger).toBeTruthy()
  })

  it('bestätigter Badge hat solid border (kein dashed / animate-pulse)', () => {
    render(<KIBadge reasoning="…" confirmed />)
    const trigger = screen.getByRole('button', { name: /Bestätigter KI-Vorschlag/i })
    expect(trigger.className).toContain('border-solid')
    expect(trigger.className).not.toContain('animate-pulse')
  })

  it('unbestätigter Badge hat dashed border + Puls', () => {
    render(<KIBadge reasoning="…" />)
    const trigger = screen.getByRole('button', { name: /KI-generierter Vorschlag/i })
    expect(trigger.className).toContain('border-dashed')
    expect(trigger.className).toContain('animate-pulse')
  })

  it('zeigt Begründung im Popover nach Klick', async () => {
    render(<KIBadge reasoning="Weil Kinder gerne Ursachen erforschen." />)
    fireEvent.click(screen.getByRole('button', { name: /KI-generierter Vorschlag/i }))
    expect(await screen.findByText(/Kinder gerne Ursachen/)).toBeTruthy()
  })
})
