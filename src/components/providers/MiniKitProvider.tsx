"use client"

import { MiniKit, ResponseEvent } from "@worldcoin/minikit-js"
import { ReactNode, useEffect, useState } from "react"

export function MiniKitProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initMiniKit = async () => {
      try {
        if (typeof window !== "undefined") {
          // Install MiniKit without APP_ID for basic functionality
          // APP_ID is mainly needed for World ID verification, not wallet auth
          MiniKit.install()
          console.log("MiniKit installed successfully")

          // Attach global listeners to avoid 'No handler for event' console errors
          const txListener = (payload: any) => {
            // Surface meaningful error for failed simulations
            if (payload?.status === "error") {
              const code = payload?.error_code
              const simulationError = payload?.details?.simulationError
              const message =
                simulationError ||
                code ||
                "Transaction failed. Please try again later."
              console.warn("MiniKit transaction error:", payload)
              // Best-effort user feedback without adding a dependency on a toast lib
              try {
                if (typeof window !== "undefined") {
                  // Non-blocking alert alternative if desired; keep minimal
                  console.error(message)
                }
              } catch {
                // no-op
              }
            }
          }

          const walletAuthListener = (payload: any) => {
            if (payload?.status === "error") {
              console.warn("MiniKit walletAuth error:", payload)
            }
          }

          MiniKit.subscribe(ResponseEvent.MiniAppSendTransaction, txListener)
          MiniKit.subscribe(ResponseEvent.MiniAppWalletAuth, walletAuthListener)

          // Wait a bit for MiniKit to fully initialize
          setTimeout(() => {
            setIsReady(true)
          }, 500)

          // Cleanup listeners on unmount
          return () => {
            try {
              MiniKit.unsubscribe(ResponseEvent.MiniAppSendTransaction)
              MiniKit.unsubscribe(ResponseEvent.MiniAppWalletAuth)
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error("MiniKit installation error:", error)
        // Continue anyway - MiniKit might still work for basic functionality
        setIsReady(true)
      }
    }

    const cleanup = initMiniKit()
    return () => {
      if (typeof cleanup === "function") cleanup()
    }
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing MiniKit...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
