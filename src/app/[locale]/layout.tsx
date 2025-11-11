import type { Metadata } from "next"
import { DM_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@/components/providers/MiniKitProvider"
import { LanguageProvider } from "@/components/providers/LanguageProvider"

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: "Valor - Gas Price Crowdsourcing",
  description: "Crowdsource gas station prices and earn rewards",
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} className={dmSans.variable}>
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        ></script>
      </head>
      <body className="antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider locale={locale}>
            <SessionProvider>
              <MiniKitProvider>
                {children}
              </MiniKitProvider>
            </SessionProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
