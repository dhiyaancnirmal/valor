import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { MiniKitProvider } from "@/components/providers/MiniKitProvider"

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
    <html lang="en">
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        ></script>
      </head>
      <body className="antialiased">
        <SessionProvider>
          <MiniKitProvider>
            {children}
          </MiniKitProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
