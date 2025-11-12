export type Locale = 'en' | 'es-AR'

export const locales: Locale[] = ['en', 'es-AR']

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'es-AR': 'Español (Argentina)'
}

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'es-AR': '🇦🇷'
}
