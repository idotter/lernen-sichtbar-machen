import type { AIService } from './service'
import { MockAdapter } from './mock-adapter'
import { AnthropicAdapter } from './anthropic-adapter'

let cached: AIService | null = null

/**
 * Returns the configured AI service. MockAdapter in Test-Umgebungen oder wenn
 * `AI_ADAPTER=mock` gesetzt ist, sonst AnthropicAdapter. Singleton pro Process.
 */
export function getAIService(): AIService {
  if (cached) return cached
  cached =
    process.env.NODE_ENV === 'test' || process.env.AI_ADAPTER === 'mock'
      ? new MockAdapter({ writeAudit: true })
      : new AnthropicAdapter()
  return cached
}

/** Für Tests, die den Cache zurücksetzen wollen. */
export function resetAIServiceCache(): void {
  cached = null
}
