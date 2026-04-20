import '@testing-library/jest-dom'

// Test-Defaults für Env-Vars (werden von einzelnen Tests überschrieben wenn nötig)
process.env.SUPABASE_JWT_SECRET ??= 'test-secret-at-least-32-chars-long-please-abc'
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000'
