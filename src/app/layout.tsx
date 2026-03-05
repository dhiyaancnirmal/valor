import type { Metadata } from "next"
import { DM_Sans } from 'next/font/google'
import "./[locale]/globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider"
import Script from "next/script"

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
      <body className="antialiased font-sans">
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
        <SessionProvider>
          <MiniKitProvider>
            {children}
          </MiniKitProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
