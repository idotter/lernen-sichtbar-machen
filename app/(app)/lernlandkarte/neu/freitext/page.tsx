'use client'
import { useActionState, useOptimistic, useRef, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createLernEntry } from '../../_actions'
import { OptimisticJourneyNode } from '@/components/features/lernlandkarte/journey-node'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full min-h-[44px]">
      {pending ? 'Wird gespeichert…' : 'Los geht\'s!'}
    </Button>
  )
}

export default function FreitextPage() {
  const router = useRouter()
  const [state, action] = useActionState(createLernEntry, null)
  const [optimisticText, setOptimisticText] = useOptimistic<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Nach Erfolg zurück zur Lernlandkarte
  useEffect(() => {
    if (state?.success) {
      router.push('/lernlandkarte')
    }
  }, [state, router])

  function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string
    if (text && text.trim().length >= 3) {
      setOptimisticText(text.trim())
    }
  }

  return (
    <div className="min-h-screen bg-lsm-bg p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] flex items-center gap-1"
          >
            ← Zurück
          </button>
          <h1 className="text-xl font-bold">Was beschäftigt dich?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beschreibe deine Frage oder was dich neugierig macht.
          </p>
        </div>

        {/* Optimistischer Preview-Node */}
        {optimisticText && (
          <OptimisticJourneyNode text={optimisticText} variant="frage" />
        )}

        <form
          ref={formRef}
          action={(formData) => {
            handleSubmit(formData)
            action(formData)
          }}
          className="space-y-4"
        >
          <Textarea
            name="text"
            placeholder="Was beschäftigt dich?"
            className="text-lg min-h-[120px] resize-none"
            required
            minLength={3}
            maxLength={500}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
          />

          {state && !state.success && (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Enter zum Abschicken · Shift+Enter für Zeilenumbruch
          </p>

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
