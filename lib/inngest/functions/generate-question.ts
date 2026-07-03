import { NonRetriableError } from 'inngest'
import { inngest } from '../client'
import { getAIService } from '@/lib/ai/factory'
import { createLearningEntry } from '@/lib/db/queries/learning-entries'
import { writeAuditLog } from '@/lib/db/queries/audit-log'
import { generateQuestionEventSchema } from '@/types/events'

export const generateQuestion = inngest.createFunction(
  {
    id: 'ai-generate-question',
    name: 'AI: Sokratische Gegenfrage generieren',
    retries: 3,
    triggers: [{ event: 'ai/generate-question' }],
  },
  async ({ event, step }: { event: { data: unknown }; step: { run: <T>(id: string, fn: () => Promise<T>) => Promise<T> } }) => {
    const parsed = generateQuestionEventSchema.safeParse(event.data)
    if (!parsed.success) {
      throw new NonRetriableError(
        `Ungültige Event-Payload: ${parsed.error.message}`
      )
    }
    const { schoolId, actorId, childId, classId, learningEntryId, learningStep, previousEntries } =
      parsed.data

    const kiResponse = await step.run('call-ai-service', async () => {
      const ai = getAIService()
      const result = await ai.generateSocraticQuestion({
        schoolId,
        childId,
        learningStep,
        previousEntries,
      })
      if (!result.success) throw new Error(result.error)
      return result.data
    })

    const entry = await step.run('insert-ki-question', async () => {
      return createLearningEntry({
        childId,
        classId,
        schoolId,
        type: 'ki_question',
        status: 'aktiv',
        text: kiResponse.question,
        parentId: learningEntryId,
        reasoning: kiResponse.reasoning,
      })
    })

    await step.run('audit-log', async () =>
      writeAuditLog({
        schoolId,
        actorId,
        eventType: 'ai/socratic-question',
        payload: {
          learningEntryId,
          resultingKiEntryId: entry.id,
          model: kiResponse.model,
          tokensUsed: kiResponse.tokensUsed,
          reasoning: kiResponse.reasoning,
        },
      })
    )

    return { kiEntryId: entry.id, question: kiResponse.question }
  }
)
