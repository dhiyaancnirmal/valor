import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./[locale]/globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider"
import Script from "next/script"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

export const metadata: Metadata = {
  title: "Valor - Community Price Intelligence",
  description: "Crowdsource essential-goods prices from nearby stores.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={manrope.variable}>
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
