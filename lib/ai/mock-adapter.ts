import { ok, type ActionResult } from '@/lib/utils/action-result'
import { writeAuditLog } from '@/lib/db/queries/audit-log'
import type {
  AIService,
  LP21Classification,
  SocraticContext,
  SocraticResponse,
} from './service'

export const MOCK_MODEL = 'mock-adapter-v1'

export interface MockAdapterOptions {
  socratic?: Partial<SocraticResponse>
  lp21?: Partial<LP21Classification>
  writeAudit?: boolean
}

/**
 * Deterministischer Mock ohne Netzwerk-Call. Genutzt in CI (NODE_ENV=test)
 * und via AI_ADAPTER=mock. Schreibt standardmässig KEIN Audit-Log,
 * damit Unit-Tests keine DB brauchen; per Option aktivierbar.
 */
export class MockAdapter implements AIService {
  constructor(private readonly opts: MockAdapterOptions = {}) {}

  async generateSocraticQuestion(
    context: SocraticContext
  ): Promise<ActionResult<SocraticResponse>> {
    const response: SocraticResponse = {
      question:
        this.opts.socratic?.question ??
        `Was denkst du, warum passiert das bei "${context.learningStep}"?`,
      reasoning:
        this.opts.socratic?.reasoning ?? 'Mock: regt zum Weiterdenken an.',
      model: MOCK_MODEL,
      tokensUsed: this.opts.socratic?.tokensUsed ?? 0,
    }
    if (this.opts.writeAudit) {
      await writeAuditLog({
        schoolId: context.schoolId,
        actorId: context.childId,
        eventType: 'ai/socratic-question',
        payload: { context, response },
      })
    }
    return ok(response)
  }

  async classifyLP21(
    text: string,
    tenantId: string,
    actorId: string
  ): Promise<ActionResult<LP21Classification>> {
    const response: LP21Classification = {
      competenceId: this.opts.lp21?.competenceId ?? 'NMG.1.1.a',
      confidence: this.opts.lp21?.confidence ?? 0.75,
      reasoning: this.opts.lp21?.reasoning ?? 'Mock: heuristische Zuordnung.',
      model: MOCK_MODEL,
      tokensUsed: this.opts.lp21?.tokensUsed ?? 0,
    }
    if (this.opts.writeAudit) {
      await writeAuditLog({
        schoolId: tenantId,
        actorId,
        eventType: 'ai/lp21-classification',
        payload: { input: text, response },
      })
    }
    return ok(response)
  }
}
