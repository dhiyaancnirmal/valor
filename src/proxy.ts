import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import {NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Check if user has manually selected a language preference
  // If they have, respect their choice and don't auto-detect
  const manualLanguagePreference = request.cookies.get('valor-language-manual')?.value
  if (manualLanguagePreference) {
    // User has manually selected a language, skip auto-detection
    return intlMiddleware(request)
  }

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
      return NextResponse.redirect(url);
    }
    
    // If pathname doesn't start with a locale, add es-AR prefix
    if (!pathname.startsWith('/es-AR') && !pathname.startsWith('/en')) {
      url.pathname = `/es-AR${pathname === '/' ? '' : pathname}`;
      return NextResponse.redirect(url);
    }
  }
  
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(es-AR|en)/:path*']
};
