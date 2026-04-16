'use server'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fromZodError, fail, type ActionResult } from '@/lib/utils/action-result'

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  passwort: z.string().min(1, 'Passwort erforderlich'),
})

export type LoginResult = ActionResult<void>

export async function loginUser(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const raw = {
    email: formData.get('email'),
    passwort: formData.get('passwort'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return fromZodError(parsed.error) as LoginResult
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.passwort,
  })

  if (error) {
    return fail('E-Mail oder Passwort ungültig.')
  }

  // Erfolgreicher Login → /einstellungen (redirect ausserhalb try/catch, da redirect() throws)
  redirect('/einstellungen')
}
