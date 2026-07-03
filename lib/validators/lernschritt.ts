import { z } from 'zod'
import { artefactFileSchema } from './artefact'

export const lernschrittTextSchema = z.object({
  parentId: z.string().uuid('Ungültige Vorhaben-ID'),
  text: z
    .string()
    .min(3, 'Mindestens 3 Zeichen eingeben')
    .max(500, 'Maximal 500 Zeichen erlaubt')
    .trim(),
})

export const lernschrittFotoSchema = z.object({
  parentId: z.string().uuid('Ungültige Vorhaben-ID'),
  file: artefactFileSchema,
  comment: z
    .string()
    .max(500, 'Kommentar maximal 500 Zeichen')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
})

export const lernschrittLinkSchema = z.object({
  parentId: z.string().uuid('Ungültige Vorhaben-ID'),
  url: z.string().url('Ungültige URL'),
  comment: z
    .string()
    .max(500, 'Kommentar maximal 500 Zeichen')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
})

export type LernschrittText = z.infer<typeof lernschrittTextSchema>
export type LernschrittFoto = z.infer<typeof lernschrittFotoSchema>
export type LernschrittLink = z.infer<typeof lernschrittLinkSchema>
