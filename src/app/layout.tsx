import type { Metadata } from "next"
import { DM_Sans } from 'next/font/google'
import "./[locale]/globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@/components/providers/MiniKitProvider"
import { I18nProvider } from "@/components/providers/I18nProvider"

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: "Valor - Gas Price Crowdsourcing",
  description: "Crowdsource gas station prices and earn rewards",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        ></script>
      </head>
      <body className="antialiased font-sans">
        <I18nProvider>
          <SessionProvider>
            <MiniKitProvider>
              {children}
            </MiniKitProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
