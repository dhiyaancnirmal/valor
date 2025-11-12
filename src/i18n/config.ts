export type Locale = 'en' | 'es-AR' | 'es'

export const locales: Locale[] = ['en', 'es-AR', 'es']

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'es-AR': 'Español (Argentina)',
  'es': 'Español'
}

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'es-AR': '🇦🇷',
  'es': '🇪🇸'
}
