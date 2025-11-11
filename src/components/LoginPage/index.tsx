"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { MiniKit } from "@worldcoin/minikit-js"

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMiniKitReady, setIsMiniKitReady] = useState(false)

  useEffect(() => {
    // Check if MiniKit is available after component mounts
    const checkMiniKit = () => {
      if (typeof window !== "undefined" && MiniKit.isInstalled()) {
        setIsMiniKitReady(true)
      }
    }

    checkMiniKit()
    // Retry after a short delay in case MiniKit loads later
    const timer = setTimeout(checkMiniKit, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleWorldcoinLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Starting World App login...")

      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        setError("Please open this app in World App")
        setIsLoading(false)
        return
      }

      console.log("MiniKit installed, requesting wallet auth...")

      // Get wallet address from MiniKit commands
      const response = await MiniKit.commandsAsync.walletAuth({
        nonce: Date.now().toString(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now()),
        statement: "Sign in to Valor to submit gas prices",
      })

      console.log("WalletAuth response:", response)

      const { finalPayload } = response

      if (!finalPayload || finalPayload.status === "error") {
        console.error("WalletAuth error:", finalPayload)
        setError(`Authentication cancelled: ${finalPayload?.error_code || 'unknown error'}`)
        setIsLoading(false)
        return
      }

      const walletAddress = finalPayload.address

      if (!walletAddress) {
        console.error("No wallet address in response")
        setError("Could not get wallet address")
        setIsLoading(false)
        return
      }

      console.log("Got wallet address:", walletAddress)

      // Use simple message and signature
      const message = `Sign in to Valor\nWallet: ${walletAddress}\nNonce: ${Date.now()}`
      const signature = finalPayload.signature || walletAddress // Use address as fallback

      console.log("Signing in with NextAuth...")

      // Sign in with NextAuth
      const result = await signIn("worldcoin", {
        walletAddress,
        signature,
        message,
        redirect: false,
      })

      console.log("NextAuth result:", result)

      if (result?.error) {
        console.error("NextAuth error:", result.error)
        setError(`Authentication failed: ${result.error}`)
        setIsLoading(false)
        return
      }

      // Success - redirect to home
      console.log("Login successful, redirecting...")
      window.location.href = "/"
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleDevLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Dev mode: create a mock wallet address
      const mockWalletAddress = "0xdev" + Math.random().toString(16).substr(2, 36)
      const message = `Sign in to Valor\nWallet: ${mockWalletAddress}\nTimestamp: ${Date.now()}`

      // Call our API to create a signature server-side
      const response = await fetch("/api/dev-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      const { signature } = await response.json()

      const result = await signIn("worldcoin", {
        walletAddress: mockWalletAddress,
        signature,
        message,
        redirect: false,
      })

      if (result?.error) {
        setError("Dev login failed")
        setIsLoading(false)
        return
      }

      window.location.href = "/"
    } catch (err) {
      console.error("Dev login error:", err)
      setError("Dev login failed")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">⛽</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Valor</h1>
          <p className="text-gray-600">
            Crowdsource gas prices and earn rewards
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {isMiniKitReady ? (
            <button
              onClick={handleWorldcoinLogin}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                "Connect with World App"
              )}
            </button>
          ) : (
            <>
              <button
                onClick={handleDevLogin}
                disabled={isLoading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                style={{ backgroundColor: '#7DD756' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  <span className="text-white">Login (Dev Mode)</span>
                )}
              </button>
              <p className="text-xs text-center text-gray-500">
                Browser testing mode - Use this to test the app
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-sm text-gray-500">
          By connecting, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
