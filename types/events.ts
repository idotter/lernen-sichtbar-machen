import { z } from 'zod'

export const baseEventPayloadSchema = z.object({
  schoolId: z.string().uuid(),
  actorId: z.string().min(1),
})

export const generateQuestionEventSchema = baseEventPayloadSchema.extend({
  childId: z.string().uuid(),
  classId: z.string().uuid(),
  learningEntryId: z.string().uuid(),
  learningStep: z.string().min(1),
  previousEntries: z.array(z.string()).default([]),
})

export type BaseEventPayload = z.infer<typeof baseEventPayloadSchema>
export type GenerateQuestionEvent = z.infer<typeof generateQuestionEventSchema>

export type InngestEvents = {
  'ai/generate-question': { data: GenerateQuestionEvent }
}
