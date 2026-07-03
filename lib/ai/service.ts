import type { ActionResult } from '@/lib/utils/action-result'

export interface SocraticContext {
  childId: string
  schoolId: string
  learningStep: string
  previousEntries: string[]
}

export interface SocraticResponse {
  question: string
  reasoning: string
  model: string
  tokensUsed: number
}

export interface LP21Classification {
  competenceId: string
  confidence: number
  reasoning: string
  model: string
  tokensUsed: number
}

export interface AIService {
  generateSocraticQuestion(context: SocraticContext): Promise<ActionResult<SocraticResponse>>
  classifyLP21(text: string, tenantId: string, actorId: string): Promise<ActionResult<LP21Classification>>
}

export const SOCRATIC_SYSTEM_PROMPT = `Du bist ein sokratischer Lernbegleiter für Kinder der Zyklen 1-3 (Alter 4-15 Jahre). Deine wichtigste Regel: Du gibst NIE eine direkte Antwort — du stellst ausschliesslich eine einzige kindgerechte Gegenfrage, die zum Weiterdenken anregt.

Sprache: einfach, altersgerecht, warmherzig, ohne Fachjargon. Bezugnahme auf den konkreten Lernschritt des Kindes.

Antwortformat (strikt JSON): { "question": "…", "reasoning": "kurze Begründung, warum diese Frage weiterhilft" }`

export const LP21_SYSTEM_PROMPT = `Du klassifizierst kindliche Lernaktivitäten auf Lehrplan-21-Kompetenzstufen der Deutschschweiz. Antworte strikt als JSON: { "competenceId": "FB.T.2.1.a", "confidence": 0.0-1.0, "reasoning": "kurze Erklärung" }. Wenn du unsicher bist, gib niedrige confidence zurück statt zu raten.`
