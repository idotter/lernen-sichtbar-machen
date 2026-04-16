import { RegistrierungForm } from '@/components/features/auth/RegistrierungForm'

export const metadata = { title: 'Schuleinheit registrieren — Lernen sichtbar machen' }

export default function RegistrierungPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Schuleinheit einrichten</h1>
        <p className="text-sm text-muted-foreground">
          Erstelle ein Konto für dich und deine Schuleinheit.
        </p>
      </div>
      <RegistrierungForm />
      <p className="text-center text-sm text-muted-foreground">
        Bereits registriert?{' '}
        <a href="/login" className="underline underline-offset-4 hover:text-primary">
          Einloggen
        </a>
      </p>
    </div>
  )
}
