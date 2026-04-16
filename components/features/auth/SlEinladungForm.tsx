'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { inviteSchulleitung, type EinladungResult } from '@/app/(app)/einstellungen/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Einladung wird verschickt…' : 'Als Schulleitung hinzufügen'}
    </Button>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

export function SlEinladungForm() {
  const [state, action, isPending] = useActionState<EinladungResult | null, FormData>(
    inviteSchulleitung,
    null
  )

  if (state?.success) {
    return (
      <div className="rounded-lg border bg-muted p-4 text-sm text-center">
        ✅ Einladung verschickt. Die Person erhält eine E-Mail.
      </div>
    )
  }

  const fieldErrors = (!state?.success && state?.fieldErrors) || {}
  const globalError = !state?.success && state?.error && !state.fieldErrors ? state.error : null

  return (
    <form action={action} className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor="sl-email">E-Mail-Adresse</Label>
        <Input
          id="sl-email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="lp@schule.ch"
          disabled={isPending}
          className={cn(fieldErrors.email && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.email} />
        {globalError && <p className="text-sm text-destructive mt-1">{globalError}</p>}
      </div>
      <SubmitButton />
    </form>
  )
}
