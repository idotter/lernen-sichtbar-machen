'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fromZodError, ok, fail, type ActionResult } from '@/lib/utils/action-result'

const registrierungSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  passwort: z.string().min(8, 'Mindestens 8 Zeichen erforderlich'),
  anzeigeName: z.string().min(2, 'Mindestens 2 Zeichen').max(50, 'Maximal 50 Zeichen'),
  schulName: z.string().min(2, 'Mindestens 2 Zeichen').max(100, 'Maximal 100 Zeichen'),
})

type RegistrierungData = z.infer<typeof registrierungSchema>
export type RegistrierungResult = ActionResult<{ pendingConfirmation: boolean }>

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function registerSchulleitung(
  _prevState: RegistrierungResult | null,
  formData: FormData
): Promise<RegistrierungResult> {
  const raw = {
    email: formData.get('email'),
    passwort: formData.get('passwort'),
    anzeigeName: formData.get('anzeigeName'),
    schulName: formData.get('schulName'),
  }

  const parsed = registrierungSchema.safeParse(raw)
  if (!parsed.success) {
    return fromZodError(parsed.error) as RegistrierungResult
  }

  const { email, passwort, anzeigeName, schulName }: RegistrierungData = parsed.data

  const baseUrl = getBaseUrl()

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: {
      emailRedirectTo: `${baseUrl}/registrierung/callback`,
      data: { displayName: anzeigeName, schulName },
    },
  })

  if (error) {
    // Keine rohen Supabase-Fehlermeldungen an den User leaken
    return fail('Registrierung fehlgeschlagen — bitte erneut versuchen.')
  }

  if (!data.user) {
    return fail('Registrierung fehlgeschlagen — bitte erneut versuchen.')
  }

  return ok({ pendingConfirmation: true })
}
