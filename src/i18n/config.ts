export const locales = ['en', 'es-AR'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'es-AR': 'Español (Argentina)',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  'es-AR': '🇦🇷',
}

