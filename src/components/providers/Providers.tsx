"use client"

import { SessionProvider } from "./SessionProvider"
import { MiniKitProvider } from "./MiniKitProvider"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MiniKitProvider>
        {children}
        <Toaster />
      </MiniKitProvider>
    </SessionProvider>
  )
}