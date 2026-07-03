'use client'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { addLernschrittMitLink } from '@/app/(app)/lernlandkarte/_actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full min-h-[44px]">
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </Button>
  )
}

interface Props {
  parentId: string
  onSuccess?: () => void
}

export function LernschrittLinkForm({ parentId, onSuccess }: Props) {
  const [state, action] = useActionState(addLernschrittMitLink, null)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state, onSuccess])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="parentId" value={parentId} />
      <Input
        name="url"
        type="url"
        placeholder="https://…"
        className="text-base min-h-[44px]"
        required
        autoFocus
      />
      <Textarea
        name="comment"
        placeholder="Kommentar (optional)"
        className="text-base min-h-[60px] resize-none"
        maxLength={500}
      />
      {state && !state.success && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  )
}
