import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const FIRMA_PROTECTED = ['/firma/panel', '/firma/profil', '/firma/leadler', '/firma/jeton', '/firma/premium', '/firma/galeri']

function isProtectedRoute(pathname: string, secretPath: string): boolean {
  if (FIRMA_PROTECTED.some(route => pathname.startsWith(route))) return true
  if (pathname.startsWith(secretPath) && !pathname.endsWith('/giris')) return true
  return false
}

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;
  const secretPath = process.env.NEXT_PUBLIC_ADMIN_SECRET_PATH || '/admin-dash'

  // 🤖 Akıllı Bot Yönetimi
  const goodBots = /googlebot|google-inspectiontool|chrome-lighthouse|storebot-google|bingbot|slurp|duckduckbot|yandexbot|baiduspider|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|applebot|gptbot|chatgpt-user|google-extended|perplexitybot|claudebot|cohere-ai|petalbot/i;
  const badBots = /scraper|spam|wget|curl|python-requests|headlesschrome|phantomjs|selenium|puppeteer|httrack|harvest|extract|nikto|sqlmap|nmap/i;

  // Sadece kötü botlardaysa VE iyi bot listesinde değilse engelle (Çifte kontrol)
  if (badBots.test(ua) && !goodBots.test(ua)) {
    return new Response(JSON.stringify({ error: 'Bot traffic detected' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 🕵️ ADMIN GİZLEME
  if (pathname.startsWith('/admin') && secretPath !== '/admin') {
    return NextResponse.rewrite(new URL('/404', request.url))
  }

  let effectivePath = pathname
  let isAdminPath = false

  if (pathname.startsWith(secretPath)) {
    isAdminPath = true
    effectivePath = pathname.replace(secretPath, '/admin')
    if (effectivePath === '/admin' || effectivePath === '/admin/') {
      effectivePath = '/admin/panel'
    }
  }

  // 🚀 Public Rotalar (Supabase'e gitmeden önce)
  if (!isProtectedRoute(pathname, secretPath)) {
    if (isAdminPath) {
      return NextResponse.rewrite(new URL(effectivePath, request.url))
    }
    return NextResponse.next()
  }

  // 🔑 Supabase İşlemleri
  // Response nesnesini burada oluşturuyoruz
  let response = isAdminPath
    ? NextResponse.rewrite(new URL(effectivePath, request.url))
    : NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // ÖNEMLİ: Mevcut response üzerinden devam ediyoruz, sıfırlamıyoruz!
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = pathname.startsWith('/firma') ? '/firma/giris' : `${secretPath}/giris`
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('[Middleware] Auth error:', error)
    return response
  }

  // 🛡️ Ekstra Güvenlik Katmanı: XSS ve Clickjacking koruması
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
