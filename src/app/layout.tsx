import type { Metadata } from "next"
import { Manrope } from "next/font/google"
import "./[locale]/globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider"

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
  const appId = process.env.NEXT_PUBLIC_APP_ID

  return (
    <html lang="en" className={manrope.variable}>
      <body className="antialiased font-sans">
        <SessionProvider>
          <MiniKitProvider props={appId ? { appId } : undefined}>
            {children}
          </MiniKitProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
