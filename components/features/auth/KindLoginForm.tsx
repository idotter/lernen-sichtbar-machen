'use client'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  validateInviteCode,
  registerChild,
  loginChild,
  type ValidateCodeResult,
  type KindAuthResult,
} from '@/app/(public)/kind-login/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Step = 'code' | 'choose' | 'register' | 'login'

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="text-sm text-destructive mt-1">{errors[0]}</p>
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full min-h-[44px] text-base"
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function KindLoginForm() {
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')

  const [codeState, codeAction] = useActionState<ValidateCodeResult | null, FormData>(
    async (prev, fd) => {
      const result = await validateInviteCode(prev, fd)
      if (result.success) {
        setCode(String(fd.get('code') ?? '').toUpperCase().trim())
        setStep('choose')
      }
      return result
    },
    null
  )

  const [regState, regAction] = useActionState<KindAuthResult | null, FormData>(
    registerChild,
    null
  )

  const [loginState, loginAction] = useActionState<KindAuthResult | null, FormData>(
    loginChild,
    null
  )

  if (step === 'code') {
    const fieldErrors = (!codeState?.success && codeState?.fieldErrors) || {}
    const globalError = !codeState?.success && codeState?.error && !codeState.fieldErrors ? codeState.error : null

    return (
      <form action={codeAction} className="space-y-4">
        <div>
          <Label htmlFor="code" className="text-base">Einladungs-Code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            placeholder="z.B. A3X9KP"
            className={cn(
              'min-h-[48px] text-center text-xl tracking-widest uppercase',
              fieldErrors.code && 'border-destructive'
            )}
          />
          <FieldError errors={fieldErrors.code} />
        </div>
        {globalError && <p className="text-sm text-destructive">{globalError}</p>}
        <SubmitButton label="Weiter" pendingLabel="Prüfe Code…" />
      </form>
    )
  }

  if (step === 'choose') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-lsm-surface p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Dein Code passt. Wie geht es weiter?
          </p>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            onClick={() => setStep('register')}
            className="w-full min-h-[48px] text-base"
          >
            Ich bin neu hier
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep('login')}
            className="w-full min-h-[48px] text-base"
          >
            Ich war schon mal hier
          </Button>
          <button
            type="button"
            onClick={() => {
              setCode('')
              setStep('code')
            }}
            className="block w-full text-center text-sm text-muted-foreground underline underline-offset-4 pt-2"
          >
            Anderer Code
          </button>
        </div>
      </div>
    )
  }

  const isRegister = step === 'register'
  const state = isRegister ? regState : loginState
  const action = isRegister ? regAction : loginAction

  const fieldErrors = (!state?.success && state?.fieldErrors) || {}
  const globalError = !state?.success && state?.error && !state.fieldErrors ? state.error : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <div>
        <Label htmlFor="displayName" className="text-base">
          {isRegister ? 'Wie heisst du?' : 'Dein Name'}
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="off"
          maxLength={50}
          className={cn('min-h-[48px] text-base', fieldErrors.displayName && 'border-destructive')}
        />
        <FieldError errors={fieldErrors.displayName} />
      </div>
      <div>
        <Label htmlFor="pin" className="text-base">
          {isRegister ? 'Wähle deine PIN (4 Zahlen)' : 'Deine PIN'}
        </Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          className={cn(
            'min-h-[48px] text-center text-xl tracking-widest',
            fieldErrors.pin && 'border-destructive'
          )}
        />
        <FieldError errors={fieldErrors.pin} />
      </div>
      {globalError && <p className="text-sm text-destructive">{globalError}</p>}
      <SubmitButton
        label={isRegister ? 'Los geht\u2019s' : 'Einloggen'}
        pendingLabel="Moment…"
      />
      <button
        type="button"
        onClick={() => setStep('choose')}
        className="block w-full text-center text-sm text-muted-foreground underline underline-offset-4 pt-1"
      >
        Zurück
      </button>
    </form>
  )
}
