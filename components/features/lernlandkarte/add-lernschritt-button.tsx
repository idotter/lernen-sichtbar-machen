'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LernschrittSheet } from './lernschritt-sheet'

interface Props {
  parentId: string
  label?: string
  className?: string
}

export function AddLernschrittButton({ parentId, label = '+ Lernschritt', className }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={`Lernschritt zu Vorhaben hinzufügen`}
        className={`min-h-[48px] w-full ${className ?? ''}`}
      >
        {label}
      </Button>
      <LernschrittSheet parentId={parentId} open={open} onOpenChange={setOpen} />
    </>
  )
}
