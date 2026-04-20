import { describe, it, expect } from 'vitest'
import { getNavItems } from './config'

describe('getNavItems', () => {
  it('Kind: gibt nur Lernlandkarte zurück', () => {
    const items = getNavItems('kind')
    expect(items).toHaveLength(1)
    expect(items[0].label).toBe('Lernlandkarte')
    expect(items[0].href).toBe('/lernlandkarte')
  })

  it('LP ohne Klassennamen: zeigt "Klasse"', () => {
    const items = getNavItems('lehrperson')
    expect(items).toHaveLength(2)
    expect(items[0].label).toBe('Klasse')
    expect(items[0].href).toBe('/klasse')
    expect(items[1].label).toBe('LP21')
    expect(items[1].href).toBe('/lp21')
  })

  it('LP mit Klassenname: zeigt "Klasse 4a"', () => {
    const items = getNavItems('lehrperson', '4a')
    expect(items[0].label).toBe('Klasse 4a')
  })

  it('SL: zeigt Übersicht und Einstellungen', () => {
    const items = getNavItems('schulleitung')
    expect(items).toHaveLength(2)
    expect(items[0].label).toBe('Übersicht')
    expect(items[0].href).toBe('/uebersicht')
    expect(items[1].label).toBe('Einstellungen')
    expect(items[1].href).toBe('/einstellungen')
  })

  it('Kind: enthält keine LP/SL-Links', () => {
    const items = getNavItems('kind')
    const hrefs = items.map(i => i.href)
    expect(hrefs).not.toContain('/klasse')
    expect(hrefs).not.toContain('/einstellungen')
    expect(hrefs).not.toContain('/uebersicht')
  })
})
