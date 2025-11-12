import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { LanguageProvider } from "@/components/providers/LanguageProvider"
import { ArgentinaLocaleDetector } from "@/components/ArgentinaLocaleDetector"

export default async function LocaleLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider messages={messages}>
      <LanguageProvider locale={locale}>
        <ArgentinaLocaleDetector />
        {children}
      </LanguageProvider>
    </NextIntlClientProvider>
  )
}
