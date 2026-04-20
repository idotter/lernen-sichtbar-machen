'use client'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { inviteLehrpersonToClass, type EinladungResult } from '@/app/(app)/klasse/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="min-h-[44px]">
      {pending ? 'Einladung wird verschickt…' : 'Lehrperson einladen'}
    </Button>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

export function LpEinladungKlasseForm() {
  const [state, action, isPending] = useActionState<EinladungResult | null, FormData>(
    inviteLehrpersonToClass,
    null
  )
  const [showSuccess, setShowSuccess] = useState(false)

  if (state?.success && !showSuccess) {
    setShowSuccess(true)
  }

  if (showSuccess && state?.success) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border bg-muted p-4 text-sm text-center">
          Einladung verschickt. Die Lehrperson erhält eine E-Mail.
        </div>
        <button
          type="button"
          onClick={() => setShowSuccess(false)}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
        >
          Weitere Lehrperson einladen
        </button>
      </div>
    )
  }

  const fieldErrors = (!state?.success && state?.fieldErrors) || {}
  const globalError = !state?.success && state?.error && !state.fieldErrors ? state.error : null

  return (
    <form action={action} className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor="lp-klasse-email">E-Mail-Adresse</Label>
        <Input
          id="lp-klasse-email"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="kollegin@schule.ch"
          disabled={isPending}
          className={cn('min-h-[44px]', fieldErrors.email && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.email} />
        {globalError && <p className="text-sm text-destructive mt-1">{globalError}</p>}
      </div>
      <SubmitButton />
    </form>
  )
}
