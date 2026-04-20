import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyChildSession } from '@/lib/auth/children-jwt'

// Öffentliche Pfade die keine Authentifizierung benötigen
const PUBLIC_PREFIXES = ['/login', '/registrierung', '/auth', '/kind-login']

// Pfade, auf denen ein eingeloggtes Kind zugreifen darf
const CHILD_ALLOWED_PREFIXES = ['/lernlandkarte']

const CHILD_COOKIE = 'child_session'

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isChildAllowedPath(pathname: string): boolean {
  return CHILD_ALLOWED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Session-Refresh — IMPORTANT: Kein Code zwischen createServerClient und getClaims()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const { pathname } = request.nextUrl

  // Kind-Session (Custom JWT) — Signatur-Check only, DB-Prüfung erfolgt auf Page-Ebene
  // via getCurrentChild() (Defense-in-Depth, siehe lib/auth/children-session.ts).
  // Patch P11: verifyChildSession kapselt Errors intern und gibt null zurück,
  // sollte der JWT-Secret fehlen oder ungültig sein → Middleware fällt fail-safe
  // in den «keine Session»-Pfad statt die ganze App auf 500 zu werfen.
  const childSessionToken = request.cookies.get(CHILD_COOKIE)?.value
  let childSession = null
  if (childSessionToken) {
    try {
      childSession = await verifyChildSession(childSessionToken)
    } catch {
      childSession = null
    }
  }

  // Patch P9: Abgelaufenes/ungültiges Cookie entfernen, damit es nicht weiter
  // an jedem Request hängt und UX-Verwirrung erzeugt ("warum bin ich eingeloggt
  // obwohl meine Session abgelaufen ist?").
  const shouldClearChildCookie = childSessionToken && !childSession
  if (shouldClearChildCookie) {
    supabaseResponse.cookies.delete(CHILD_COOKIE)
  }

  // Eingeloggtes Kind auf /kind-login oder /login → direkt zur Lernlandkarte
  if (childSession && (pathname === '/kind-login' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/lernlandkarte'
    return NextResponse.redirect(url)
  }

  // Authentifizierungs-Check: weder Erwachsenen-User noch Kind-Session
  if (!user && !childSession && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Kind-Session: darf nur auf CHILD_ALLOWED_PREFIXES zugreifen, kein LP/SL-Bereich
  if (childSession && !user && !isPublicPath(pathname) && !isChildAllowedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/lernlandkarte'
    return NextResponse.redirect(url)
  }

  // Patch P7: Eingeloggte LP/SL auf /login, /registrierung oder /kind-login → /einstellungen.
  // /kind-login ist zwar ein Kinder-Flow, aber eine eingeloggte LP würde sonst
  // dort ein Kind-Konto unter ihrer eigenen Session registrieren können.
  if (user && (pathname === '/login' || pathname === '/registrierung' || pathname === '/kind-login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/einstellungen'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Alle Routen ausser Next.js-Internals und statische Assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
