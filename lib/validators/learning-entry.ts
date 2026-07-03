import { z } from 'zod'

export const createLernEntrySchema = z.object({
  text: z
    .string()
    .min(3, 'Mindestens 3 Zeichen eingeben')
    .max(500, 'Maximal 500 Zeichen erlaubt')
    .trim(),
})

export type CreateLernEntryInput = z.infer<typeof createLernEntrySchema>
