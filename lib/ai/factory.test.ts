import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db/queries/audit-log', () => ({ writeAuditLog: vi.fn() }))
vi.mock('./anthropic-adapter', () => ({
  AnthropicAdapter: vi.fn(function () { return { __type: 'anthropic' } }),
}))

import { getAIService, resetAIServiceCache } from './factory'
import { MockAdapter } from './mock-adapter'
import { AnthropicAdapter } from './anthropic-adapter'

describe('getAIService', () => {
  beforeEach(() => {
    resetAIServiceCache()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('gibt MockAdapter zurück wenn NODE_ENV=test', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const svc = getAIService()
    expect(svc).toBeInstanceOf(MockAdapter)
  })

  it('gibt MockAdapter zurück wenn AI_ADAPTER=mock (auch in production)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_ADAPTER', 'mock')
    const svc = getAIService()
    expect(svc).toBeInstanceOf(MockAdapter)
  })

  it('gibt AnthropicAdapter zurück in production ohne AI_ADAPTER=mock', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('AI_ADAPTER', undefined)
    getAIService()
    expect(AnthropicAdapter).toHaveBeenCalledOnce()
  })

  it('cached Singleton', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const a = getAIService()
    const b = getAIService()
    expect(a).toBe(b)
  })
})
