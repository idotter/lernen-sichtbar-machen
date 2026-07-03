import { describe, it, expect } from 'vitest'
import { generateQuestionEventSchema, baseEventPayloadSchema } from './events'

const UUID = '11111111-1111-4111-8111-111111111111'

describe('generateQuestionEventSchema', () => {
  const valid = {
    schoolId: UUID,
    actorId: UUID,
    childId: UUID,
    classId: UUID,
    learningEntryId: UUID,
    learningStep: 'Warum ist Wasser nass?',
    previousEntries: [],
  }

  it('akzeptiert gültige Payload', () => {
    expect(generateQuestionEventSchema.safeParse(valid).success).toBe(true)
  })

  it('lehnt ungültige UUIDs ab', () => {
    expect(
      generateQuestionEventSchema.safeParse({ ...valid, schoolId: 'x' }).success
    ).toBe(false)
  })

  it('lehnt leeren learningStep ab', () => {
    expect(
      generateQuestionEventSchema.safeParse({ ...valid, learningStep: '' }).success
    ).toBe(false)
  })

  it('previousEntries defaultet auf []', () => {
    const { previousEntries: _drop, ...rest } = valid
    void _drop
    const r = generateQuestionEventSchema.safeParse(rest)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.previousEntries).toEqual([])
  })
})

describe('baseEventPayloadSchema', () => {
  it('verlangt schoolId + actorId', () => {
    expect(baseEventPayloadSchema.safeParse({}).success).toBe(false)
  })
})
