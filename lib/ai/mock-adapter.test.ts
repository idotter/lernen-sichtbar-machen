import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/queries/audit-log', () => ({ writeAuditLog: vi.fn() }))

import { MockAdapter, MOCK_MODEL } from './mock-adapter'
import { writeAuditLog } from '@/lib/db/queries/audit-log'

const CTX = {
  childId: 'child-1',
  schoolId: 'school-1',
  learningStep: 'Warum regnet es?',
  previousEntries: [],
}

describe('MockAdapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gibt deterministische Sokratische Frage zurück', async () => {
    const a = new MockAdapter()
    const r = await a.generateSocraticQuestion(CTX)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.model).toBe(MOCK_MODEL)
      expect(r.data.question).toContain('Warum regnet es?')
    }
  })

  it('respektiert overrides', async () => {
    const a = new MockAdapter({ socratic: { question: 'Testfrage', reasoning: 'X' } })
    const r = await a.generateSocraticQuestion(CTX)
    if (r.success) expect(r.data.question).toBe('Testfrage')
  })

  it('schreibt kein Audit-Log ohne writeAudit-Flag', async () => {
    const a = new MockAdapter()
    await a.generateSocraticQuestion(CTX)
    expect(writeAuditLog).not.toHaveBeenCalled()
  })

  it('schreibt Audit-Log mit writeAudit=true', async () => {
    const a = new MockAdapter({ writeAudit: true })
    await a.generateSocraticQuestion(CTX)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        actorId: 'child-1',
        eventType: 'ai/socratic-question',
      })
    )
  })

  it('classifyLP21 liefert competenceId + confidence', async () => {
    const a = new MockAdapter({ lp21: { competenceId: 'FB.T.2.1.a', confidence: 0.9 } })
    const r = await a.classifyLP21('Text', 'school-1', 'child-1')
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.competenceId).toBe('FB.T.2.1.a')
      expect(r.data.confidence).toBe(0.9)
    }
  })
})
