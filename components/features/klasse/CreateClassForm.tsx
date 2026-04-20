'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createClass, type CreateClassResult } from '@/app/(app)/klasse/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="min-h-[44px]">
      {pending ? 'Wird erstellt…' : 'Klasse erstellen'}
    </Button>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

export function CreateClassForm() {
  const [state, action, isPending] = useActionState<CreateClassResult | null, FormData>(
    createClass,
    null
  )

  const fieldErrors = (!state?.success && state?.fieldErrors) || {}
  const globalError = !state?.success && state?.error && !state.fieldErrors ? state.error : null

  return (
    <form action={action} className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor="class-name">Klassenname</Label>
        <Input
          id="class-name"
          name="name"
          type="text"
          autoComplete="off"
          placeholder="z. B. 3a"
          disabled={isPending}
          className={cn('min-h-[44px]', fieldErrors.name && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.name} />
        {globalError && <p className="text-sm text-destructive mt-1">{globalError}</p>}
      </div>
      <SubmitButton />
    </form>
  )
}
