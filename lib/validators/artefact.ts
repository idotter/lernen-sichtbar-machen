import { z } from 'zod'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB (NFR18)
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const EXTENSION_BY_MIME: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

export const artefactFileSchema = z.object({
  name: z.string().min(1),
  size: z
    .number()
    .int()
    .positive('Datei ist leer')
    .max(MAX_FILE_SIZE, 'Datei überschreitet 10 MB'),
  type: z.enum(ALLOWED_MIME_TYPES, {
    message: 'Nur JPG, PNG, GIF oder PDF erlaubt',
  }),
})

export const artefactUploadSchema = z.object({
  file: artefactFileSchema,
  comment: z
    .string()
    .max(500, 'Kommentar maximal 500 Zeichen')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
})

export type ArtefactUploadInput = z.infer<typeof artefactUploadSchema>
