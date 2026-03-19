import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected routes that require authentication
const FIRMA_PROTECTED = ['/firma/panel', '/firma/profil', '/firma/leadler', '/firma/jeton', '/firma/premium', '/firma/galeri']
const ADMIN_EXCLUDED = ['/giris']

function isProtectedRoute(pathname: string, secretPath: string): boolean {
  if (FIRMA_PROTECTED.some(route => pathname.startsWith(route))) return true
  
  // Eğer gizli yol ile gelirse ve /giris değilse korumalıdır
  if (pathname.startsWith(secretPath) && !pathname.endsWith('/giris')) return true
  
  return false
}

export async function middleware(request: NextRequest) {
  const botPatterns = /bot|crawl|spider|scraper|wget|curl/i;
  const ua = request.headers.get('user-agent') || '';
  if (botPatterns.test(ua)) {
    return new Response(null, { status: 403 });
  }

  const pathname = request.nextUrl.pathname

  const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || '/admin-dash'

  // 🕵️ ADMIN GİZLEME (Full Stealth): 
  // 1. Standart /admin ile başlayan her şeye 404 ver (eğer gizli yol /admin değilse)
  if (pathname.startsWith('/admin') && secretPath !== '/admin') {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  // 2. Gizli yol ile gelen istekleri içten /admin'e yönlendir (rewrite)
  let effectivePath = pathname
  if (pathname.startsWith(secretPath)) {
    effectivePath = pathname.replace(secretPath, '/admin')
    if (effectivePath === '/admin' || effectivePath === '/admin/') {
      effectivePath = '/admin/panel'
    }
  }

  // 🚀 Public rotalar için Supabase'e hiç sorgu atmadan devam et
  if (!isProtectedRoute(pathname, secretPath)) {
    // Eğer gizli yolun render edilmesini istiyorsak rewrite ile devam etmeliyiz
    if (pathname.startsWith(secretPath)) {
      // ÖNEMLİ: Eğer effectivePath ana /admin değilse rewrite yap (Loop'u önle)
      return NextResponse.rewrite(new URL(effectivePath, request.url))
    }
    return NextResponse.next()
  }

  // Sadece korumalı rotalarda Supabase session kontrolü yap
  let supabaseResponse = NextResponse.next({ request })
  if (pathname.startsWith(secretPath)) {
    supabaseResponse = NextResponse.rewrite(new URL(effectivePath, request.url))
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 🛡️ try-catch ile sarmalama: Supabase kesintisi tüm siteyi durdurmasın
  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    // Supabase erişilemiyorsa kullanıcıyı geçir, sayfa kendi kontrolünü yapsın
    console.error('[Middleware] Supabase auth error:', error)
    return supabaseResponse
  }

  // Giriş yapmamış kullanıcıları yönlendir
  if (!user) {
    const url = request.nextUrl.clone()

    if (FIRMA_PROTECTED.some(route => pathname.startsWith(route))) {
      url.pathname = '/firma/giris'
    } else {
      url.pathname = `${secretPath}/giris`
    }

    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
