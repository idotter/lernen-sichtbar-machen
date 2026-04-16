'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { registerSchulleitung, type RegistrierungResult } from '@/app/(public)/registrierung/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Registrierung läuft…' : 'Registrieren'}
    </Button>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

export function RegistrierungForm() {
  const [state, action] = useActionState<RegistrierungResult | null, FormData>(
    registerSchulleitung,
    null
  )

  if (state?.success) {
    return (
      <div className="rounded-lg border bg-lsm-surface p-6 text-center space-y-2">
        <h2 className="font-semibold text-lg">E-Mail bestätigen</h2>
        <p className="text-muted-foreground text-sm">
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klick den Link darin, um die
          Registrierung abzuschliessen.
        </p>
      </div>
    )
  }

  const fieldErrors = (!state?.success && state?.fieldErrors) || {}
  const globalError = !state?.success && state?.error && !state.fieldErrors ? state.error : null

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={cn(fieldErrors.email && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.email} />
      </div>

      <div>
        <Label htmlFor="passwort">Passwort</Label>
        <Input
          id="passwort"
          name="passwort"
          type="password"
          autoComplete="new-password"
          className={cn(fieldErrors.passwort && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.passwort} />
      </div>

      <div>
        <Label htmlFor="anzeigeName">Dein Anzeigename</Label>
        <Input
          id="anzeigeName"
          name="anzeigeName"
          type="text"
          autoComplete="name"
          className={cn(fieldErrors.anzeigeName && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.anzeigeName} />
      </div>

      <div>
        <Label htmlFor="schulName">Name der Schuleinheit</Label>
        <Input
          id="schulName"
          name="schulName"
          type="text"
          className={cn(fieldErrors.schulName && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.schulName} />
      </div>

      {globalError && (
        <p className="text-sm text-destructive">{globalError}</p>
      )}

      <SubmitButton />
    </form>
  )
}
