import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { LanguageProvider } from "@/components/providers/LanguageProvider"
import { MobileViewportProvider } from "@/components/providers/MobileViewportProvider"
import { ArgentinaLocaleDetector } from "@/components/ArgentinaLocaleDetector"
import { locales } from "@/i18n/config"

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound()
  }
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider messages={messages}>
      <MobileViewportProvider>
        <LanguageProvider locale={locale}>
          <ArgentinaLocaleDetector />
          {children}
        </LanguageProvider>
      </MobileViewportProvider>
    </NextIntlClientProvider>
  )
}
