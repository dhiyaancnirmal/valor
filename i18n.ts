import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, locales } from './src/i18n/config'

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = isSupportedLocale(locale) ? locale : defaultLocale

  return {
    locale: resolvedLocale,
    messages: (await import(`./src/messages/${resolvedLocale}.json`)).default
  }
})

function isSupportedLocale(value: string | undefined): value is (typeof locales)[number] {
  return Boolean(value && locales.includes(value as (typeof locales)[number]))
}
