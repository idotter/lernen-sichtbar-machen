import { KindLoginForm } from '@/components/features/auth/KindLoginForm'

export const metadata = { title: 'Anmelden — Lernen sichtbar machen' }

export default function KindLoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Anmelden</h1>
        <p className="text-sm text-muted-foreground">
          Mit deinem Einladungs-Code und deiner PIN
        </p>
      </div>
      <KindLoginForm />
    </div>
  )
}
