'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { fromZodError, ok, fail, type ActionResult } from '@/lib/utils/action-result'
import { headers } from 'next/headers'

const registrierungSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  passwort: z.string().min(8, 'Mindestens 8 Zeichen erforderlich'),
  anzeigeName: z.string().min(2, 'Mindestens 2 Zeichen').max(50, 'Maximal 50 Zeichen'),
  schulName: z.string().min(2, 'Mindestens 2 Zeichen').max(100, 'Maximal 100 Zeichen'),
})

type RegistrierungData = z.infer<typeof registrierungSchema>
export type RegistrierungResult = ActionResult<{ pendingConfirmation: boolean }>

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

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passwort,
    options: {
      emailRedirectTo: `${origin}/registrierung/callback`,
      data: { displayName: anzeigeName, schulName },
    },
  })

  if (error) {
    return fail(error.message)
  }

  if (!data.user) {
    return fail('Registrierung fehlgeschlagen — bitte erneut versuchen.')
  }

  return ok({ pendingConfirmation: true })
}
