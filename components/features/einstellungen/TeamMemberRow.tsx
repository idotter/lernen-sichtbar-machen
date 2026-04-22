'use client'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { promoteToSchulleitung } from '@/app/(app)/einstellungen/_actions'
import type { User } from '@/lib/db/schema/users'

const ROLE_LABELS: Record<string, string> = {
  schulleitung: 'Schulleitung',
  lehrperson: 'Lehrperson',
}

function PromoteButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="min-h-[44px] text-xs"
    >
      {pending ? 'Wird gespeichert…' : 'SL-Rechte vergeben'}
    </Button>
  )
}

interface Props {
  member: User
  canPromote: boolean
}

export function TeamMemberRow({ member, canPromote }: Props) {
  const [state, action] = useActionState(promoteToSchulleitung, null)

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">
          {member.displayName ?? member.email}
        </span>
        <span className="text-xs text-muted-foreground truncate">{member.email}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-xs">
          {ROLE_LABELS[member.role] ?? member.role}
        </Badge>
        {canPromote && member.role === 'lehrperson' && (
          <form action={action}>
            <input type="hidden" name="userId" value={member.id} />
            <PromoteButton />
          </form>
        )}
      </div>
      {state && !state.success && (
        <p className="text-xs text-destructive mt-1 col-span-2">{state.error}</p>
      )}
    </div>
  )
}
