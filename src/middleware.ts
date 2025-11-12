import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import {NextRequest} from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Check for Argentina country code from various sources
  const countryCode = 
    request.headers.get('x-vercel-ip-country') || // Vercel
    request.headers.get('cf-ipcountry') || // Cloudflare
    request.headers.get('x-country-code'); // Custom header
  
  // If user is in Argentina, redirect to Spanish locale
  if (countryCode === 'AR') {
    const url = request.nextUrl.clone();
    const pathname = url.pathname;
    
    // If already on Spanish locale, let intlMiddleware handle it
    if (pathname.startsWith('/es-AR')) {
      return intlMiddleware(request);
    }
    
    // If on /en path or root, redirect to /es-AR
    if (pathname.startsWith('/en') || pathname === '/') {
      url.pathname = pathname === '/' 
        ? '/es-AR' 
        : pathname.replace('/en', '/es-AR');
      // Preserve query parameters
      return Response.redirect(url);
    }
    
    // If pathname doesn't start with a locale, add es-AR prefix
    if (!pathname.startsWith('/es-AR') && !pathname.startsWith('/en')) {
      url.pathname = `/es-AR${pathname === '/' ? '' : pathname}`;
      return Response.redirect(url);
    }
  }
  
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(es-AR|en)/:path*']
};