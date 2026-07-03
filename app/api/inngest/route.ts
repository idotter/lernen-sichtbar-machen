import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { generateQuestion } from '@/lib/inngest/functions/generate-question'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateQuestion],
})
