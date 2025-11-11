"use client"

import { MiniKit } from "@worldcoin/minikit-js"
import { ReactNode, useEffect, useState } from "react"

export function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initMiniKit = async () => {
      try {
        if (typeof window !== "undefined") {
          MiniKit.install(process.env.NEXT_PUBLIC_APP_ID || "")
          setIsReady(true)
        }
      } catch (error) {
        console.error("MiniKit installation error:", error)
        setIsReady(true) // Continue anyway for development
      }
    }

    initMiniKit()
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
