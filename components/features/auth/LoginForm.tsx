'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginUser, type LoginResult } from '@/app/(public)/login/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Einloggen…' : 'Einloggen'}
    </Button>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

export function LoginForm() {
  const [state, action] = useActionState<LoginResult | null, FormData>(loginUser, null)

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
          autoComplete="current-password"
          className={cn(fieldErrors.passwort && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.passwort} />
      </div>

      {globalError && (
        <p className="text-sm text-destructive">{globalError}</p>
      )}

      <SubmitButton />
    </form>
  )
}
