import { createAdminClient } from '@/lib/supabase/admin'
import { EXTENSION_BY_MIME, type AllowedMimeType } from '@/lib/validators/artefact'

export const ARTEFAKTE_BUCKET = 'artefakte'

export interface UploadArtefaktParams {
  schoolId: string
  childId: string
  entryId: string
  file: File
}

export interface UploadedArtefakt {
  path: string
  publicUrl: string
  mimeType: AllowedMimeType
  sizeBytes: number
}

/**
 * Lädt eine Datei in den Supabase-Storage-Bucket `artefakte`.
 * Pfad-Schema: `{schoolId}/{childId}/{entryId}/{uuid}.{ext}`.
 */
export async function uploadArtefakt({
  schoolId,
  childId,
  entryId,
  file,
}: UploadArtefaktParams): Promise<UploadedArtefakt> {
  const mimeType = file.type as AllowedMimeType
  const ext = EXTENSION_BY_MIME[mimeType]
  if (!ext) throw new Error(`Nicht unterstützter Dateityp: ${file.type}`)

  const uuid = crypto.randomUUID()
  const path = `${schoolId}/${childId}/${entryId}/${uuid}.${ext}`

  const supabase = createAdminClient()
  const { error } = await supabase.storage
    .from(ARTEFAKTE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(`Upload fehlgeschlagen: ${error.message}`)

  const { data } = supabase.storage.from(ARTEFAKTE_BUCKET).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
    mimeType,
    sizeBytes: file.size,
  }
}
