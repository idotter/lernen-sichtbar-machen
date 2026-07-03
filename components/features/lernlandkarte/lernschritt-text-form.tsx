'use client'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { addLernschritt } from '@/app/(app)/lernlandkarte/_actions'

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

export function LernschrittTextForm({ parentId, onSuccess }: Props) {
  const [state, action] = useActionState(addLernschritt, null)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state, onSuccess])

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="parentId" value={parentId} />
      <Textarea
        name="text"
        placeholder="Was hast du gelernt?"
        className="text-base min-h-[100px] resize-none"
        required
        minLength={3}
        maxLength={500}
        autoFocus
      />
      {state && !state.success && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  )
}
