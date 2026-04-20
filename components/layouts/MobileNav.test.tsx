import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileNav } from './MobileNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/klasse',
}))

const items = [
  { label: 'Klasse 4a', href: '/klasse' },
  { label: 'LP21', href: '/lp21' },
]

describe('MobileNav', () => {
  it('rendert Hamburger-Button', () => {
    render(<MobileNav items={items} displayName="Marlene Muster" />)
    expect(screen.getByRole('button', { name: /navigation öffnen/i })).toBeTruthy()
  })

  it('zeigt Nav-Items nach Klick auf Hamburger', async () => {
    render(<MobileNav items={items} displayName="Marlene Muster" />)
    const trigger = screen.getByRole('button', { name: /navigation öffnen/i })
    fireEvent.click(trigger)
    expect(await screen.findByText('Klasse 4a')).toBeTruthy()
    expect(await screen.findByText('LP21')).toBeTruthy()
  })

  it('zeigt Anzeigenamen nach Klick auf Hamburger', async () => {
    render(<MobileNav items={items} displayName="Marlene Muster" />)
    fireEvent.click(screen.getByRole('button', { name: /navigation öffnen/i }))
    expect(await screen.findByText('Marlene Muster')).toBeTruthy()
  })
})
