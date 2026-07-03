import { z } from 'zod'

export const einstiegsfrageSchema = z.object({
  id: z.string().min(1),
  text: z
    .string()
    .min(3)
    .refine((v) => v.trim().split(/\s+/).length <= 15, {
      message: 'Maximal 15 Wörter',
    }),
  icon: z.string().min(1),
  category: z.enum(['natur', 'weltall', 'technik', 'tiere', 'menschen']),
})

export type Einstiegsfrage = z.infer<typeof einstiegsfrageSchema>

export const EINSTIEGSFRAGEN: readonly Einstiegsfrage[] = [
  { id: 'ef-himmel-blau', text: 'Warum ist der Himmel blau?', icon: '☁️', category: 'natur' },
  { id: 'ef-vulkan', text: 'Wie funktioniert ein Vulkan?', icon: '🌋', category: 'natur' },
  { id: 'ef-essen', text: 'Woher kommt unser Essen?', icon: '🌱', category: 'menschen' },
  { id: 'ef-tiere-winter', text: 'Wie leben Tiere im Winter?', icon: '❄️', category: 'tiere' },
  { id: 'ef-weltall', text: 'Was passiert im Weltall?', icon: '⭐', category: 'weltall' },
  { id: 'ef-roboter', text: 'Wie funktioniert ein Roboter?', icon: '🤖', category: 'technik' },
] as const

export function getEinstiegsfrageById(id: string): Einstiegsfrage | undefined {
  return EINSTIEGSFRAGEN.find((f) => f.id === id)
}
