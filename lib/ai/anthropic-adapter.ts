import Anthropic from '@anthropic-ai/sdk'
import { ok, fail, type ActionResult } from '@/lib/utils/action-result'
import { writeAuditLog } from '@/lib/db/queries/audit-log'
import {
  LP21_SYSTEM_PROMPT,
  SOCRATIC_SYSTEM_PROMPT,
  type AIService,
  type LP21Classification,
  type SocraticContext,
  type SocraticResponse,
} from './service'

const DEFAULT_MODEL = 'claude-sonnet-5'

export interface AnthropicAdapterOptions {
  apiKey?: string
  model?: string
}

interface JsonEnvelope {
  question?: string
  reasoning?: string
  competenceId?: string
  confidence?: number
}

/**
 * Extrahiert das erste JSON-Objekt aus dem Anthropic-Response-Text.
 * Fällt bei Parse-Fehler auf null zurück.
 */
function parseFirstJson(text: string): JsonEnvelope | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export class AnthropicAdapter implements AIService {
  private readonly client: Anthropic
  private readonly model: string

  constructor(opts: AnthropicAdapterOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY ist nicht gesetzt.')
    this.client = new Anthropic({ apiKey })
    this.model = opts.model ?? DEFAULT_MODEL
  }

  async generateSocraticQuestion(
    context: SocraticContext
  ): Promise<ActionResult<SocraticResponse>> {
    const userMessage = [
      `Lernschritt: ${context.learningStep}`,
      context.previousEntries.length > 0
        ? `Bisherige Schritte:\n- ${context.previousEntries.join('\n- ')}`
        : null,
      'Antworte im geforderten JSON-Format.',
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 400,
        system: SOCRATIC_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        metadata: { user_id: `${context.schoolId}:${context.childId}` },
      })

      const text = msg.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
      const parsed = parseFirstJson(text)
      if (!parsed?.question || !parsed?.reasoning) {
        return fail('KI-Antwort konnte nicht als JSON gelesen werden.')
      }

      const response: SocraticResponse = {
        question: parsed.question,
        reasoning: parsed.reasoning,
        model: this.model,
        tokensUsed: msg.usage.input_tokens + msg.usage.output_tokens,
      }

      await writeAuditLog({
        schoolId: context.schoolId,
        actorId: context.childId,
        eventType: 'ai/socratic-question',
        payload: { context, response, rawText: text },
      })

      return ok(response)
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'KI-Call fehlgeschlagen.')
    }
  }

  async classifyLP21(
    text: string,
    tenantId: string,
    actorId: string
  ): Promise<ActionResult<LP21Classification>> {
    try {
      const msg = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        system: LP21_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Lernaktivität:\n${text}` }],
        metadata: { user_id: `${tenantId}:${actorId}` },
      })

      const raw = msg.content
        .filter((c): c is Anthropic.TextBlock => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
      const parsed = parseFirstJson(raw)
      if (!parsed?.competenceId || typeof parsed.confidence !== 'number') {
        return fail('LP21-Antwort konnte nicht gelesen werden.')
      }

      const response: LP21Classification = {
        competenceId: parsed.competenceId,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning ?? '',
        model: this.model,
        tokensUsed: msg.usage.input_tokens + msg.usage.output_tokens,
      }

      await writeAuditLog({
        schoolId: tenantId,
        actorId,
        eventType: 'ai/lp21-classification',
        payload: { input: text, response, rawText: raw },
      })

      return ok(response)
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'KI-Call fehlgeschlagen.')
    }
  }
}
