import { LoginForm } from '@/components/features/auth/LoginForm'

export const metadata = { title: 'Einloggen — Lernen sichtbar machen' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Einloggen</h1>
        <p className="text-sm text-muted-foreground">
          Lehrperson oder Schulleitung
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Noch kein Konto?{' '}
        <a href="/registrierung" className="underline underline-offset-4 hover:text-primary">
          Schuleinheit registrieren
        </a>
      </p>
    </div>
  )
}
