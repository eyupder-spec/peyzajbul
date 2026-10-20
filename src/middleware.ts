import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Firm-portal pages that require a signed-in user (individual pages still guard themselves client-side).
// /firma/giris and /firma/[slug] stay public.
const FIRMA_PROTECTED = [
  '/firma/panel',
  '/firma/profil',
  '/firma/leadler',
  '/firma/jeton',
  '/firma/premium',
  '/firma/galeri',
  '/firma/projeler',
  '/firma/reklam',
  '/firma/urunler',
  '/firma/landing',
]

const ADMIN_NOINDEX = 'noindex, nofollow, noarchive'

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + '/')
}

/**
 * Optional obscured entry point for the admin panel (e.g. "/yonetim-x7k2"). Prefer the server-only
 * ADMIN_SECRET_PATH; NEXT_PUBLIC_ADMIN_SECRET_PATH is read only for backwards compatibility.
 * The path is NOT a secret that protects anything: authorization is the admin-role check below.
 */
function getSecretPath(): string | null {
  const raw = (process.env.ADMIN_SECRET_PATH || process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || '').trim()
  const normalized = '/' + raw.replace(/^\/+|\/+$/g, '')
  if (normalized === '/' || normalized === '/admin') return null
  return normalized
}

// Real HTTP 404 (not a 200 "not found" page) so admin routes are indistinguishable from missing ones.
function adminNotFound(): NextResponse {
  return new NextResponse('<!doctype html><meta charset="utf-8"><title>404</title><h1>404 – Sayfa bulunamadı</h1>', {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex',
      'cache-control': 'private, no-store',
    },
  })
}

function markPrivate(response: NextResponse): NextResponse {
  response.headers.set('X-Robots-Tag', ADMIN_NOINDEX)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

function redirectTo(request: NextRequest, pathname: string, from: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  url.searchParams.set('redirectedFrom', request.nextUrl.pathname)
  const redirect = NextResponse.redirect(url)
  // Keep any session cookie changes (e.g. cleared invalid tokens) made while validating the user
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

// Supabase client bound to the request cookies. `state.response` always holds the latest response,
// because refreshed session cookies must be written onto whichever response is finally returned.
function createSessionClient(request: NextRequest, makeResponse: () => NextResponse) {
  const state = { response: makeResponse() }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          state.response = makeResponse()
          cookiesToSet.forEach(({ name, value, options }) => state.response.cookies.set(name, value, options))
        },
      },
    }
  )
  return { supabase, state }
}

async function handleAdmin(request: NextRequest, secretPath: string | null): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname
  const base = secretPath ?? '/admin'
  const relative = pathname.slice(base.length)

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = relative === '' || relative === '/' ? '/admin/panel' : `/admin${relative}`
  const makeResponse = () => NextResponse.rewrite(rewriteUrl, { request })

  // The login page itself must be reachable without a session
  if (relative.replace(/\/+$/, '') === '/giris') {
    return markPrivate(makeResponse())
  }

  // Fail closed: any problem validating the session or the admin role returns the 404
  try {
    const { supabase, state } = createSessionClient(request, makeResponse)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user) {
      if (userError && (isAuthRetryableFetchError(userError) || (userError.status ?? 0) >= 500)) {
        return adminNotFound()
      }
      return markPrivate(redirectTo(request, `${base}/giris`, state.response))
    }

    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !adminRole) return adminNotFound()

    return markPrivate(state.response)
  } catch (error) {
    console.error('[Middleware] Admin auth error:', error)
    return adminNotFound()
  }
}

async function handleFirm(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, state } = createSessionClient(request, () => NextResponse.next({ request }))
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return redirectTo(request, '/firma/giris', state.response)
    return state.response
  } catch (error) {
    // Firm pages guard themselves client-side as well, so a Supabase outage must not take them down
    console.error('[Middleware] Auth error:', error)
    return NextResponse.next({ request })
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const secretPath = getSecretPath()

  if (isUnder(pathname, '/admin')) {
    // With a secret path configured the literal /admin/** routes do not exist for the outside world
    if (secretPath) return adminNotFound()
    return handleAdmin(request, null)
  }

  if (secretPath && isUnder(pathname, secretPath)) {
    return handleAdmin(request, secretPath)
  }

  if (FIRMA_PROTECTED.some((route) => isUnder(pathname, route))) {
    return handleFirm(request)
  }

  return NextResponse.next()
}

export const config = {
  // Skip API routes, build assets and static files so they never pay for a middleware invocation
  matcher: ['/((?!api|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|webp|avif|svg|txt|xml|json|webmanifest)$).*)'],
}
