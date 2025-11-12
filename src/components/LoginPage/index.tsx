"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { signIn } from "next-auth/react"
import { MiniKit } from "@worldcoin/minikit-js"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import WorldIDLogo from "@/components/WorldIDLogo"

export function LoginPage() {
  const { t } = useTranslation(['login', 'common'])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMiniKitReady, setIsMiniKitReady] = useState(false)

  useEffect(() => {
    // Check if MiniKit is available after component mounts
    const checkMiniKit = () => {
      if (typeof window !== "undefined") {
        const isInstalled = MiniKit.isInstalled()
        console.log("MiniKit installed check:", isInstalled)
        setIsMiniKitReady(isInstalled)

        if (!isInstalled) {
          // Keep checking for MiniKit to load
          setTimeout(checkMiniKit, 1000)
        }
      }
    }

    checkMiniKit()
  }, [])

  const handleWorldcoinLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Starting World App login...")

      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        setError(t('login:errors.notInWorldApp'))
        setIsLoading(false)
        return
      }

      console.log("MiniKit installed, requesting wallet auth...")

      // Use async walletAuth command as per documentation
      console.log("Calling MiniKit.commandsAsync.walletAuth...")
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: Date.now().toString(),
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now()),
        statement: t("login.signInStatement"),
      })

      console.log("WalletAuth response:", { commandPayload, finalPayload })

      if (finalPayload.status === 'error') {
        // Don't show error for user rejection - this is normal behavior
        if (finalPayload.error_code === 'user_rejected') {
          setIsLoading(false)
          return
        }
        console.error("WalletAuth error:", finalPayload)
        setError(finalPayload.error_code || t('login:errors.authFailed'))
        setIsLoading(false)
        return
      }

      if (finalPayload.status !== 'success') {
        console.error("WalletAuth failed:", finalPayload)
        setError(t('login:errors.invalidResponse'))
        setIsLoading(false)
        return
      }

      // Extract wallet address and signature from finalPayload
      const walletAddress = finalPayload.address
      const signature = finalPayload.signature

      if (!walletAddress) {
        console.error("No wallet address in response:", finalPayload)
        setError(t('login:errors.noWalletAddress'))
        setIsLoading(false)
        return
      }

      console.log("Got wallet address:", walletAddress)
      console.log("Got signature:", signature)

      // Get user profile data from MiniKit after successful auth
      const userProfile = MiniKit.user
      console.log("User profile from MiniKit:", userProfile)

      // Use the message from the finalPayload (SIWE message)
      const message = finalPayload.message

      console.log("Signing in with NextAuth...")

      // Sign in with NextAuth
      const result = await signIn("worldcoin", {
        walletAddress,
        signature,
        message,
        username: userProfile?.username,
        profilePictureUrl: userProfile?.profilePictureUrl,
        redirect: false,
      })

      console.log("NextAuth result:", result)

      if (result?.error) {
        console.error("NextAuth error:", result.error)
        setError(`${t('login:errors.authFailed')}: ${result.error}`)
        setIsLoading(false)
        return
      }

      // Success - redirect to home
      console.log("Login successful, redirecting...")
      window.location.href = "/"
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : t('login:errors.errorOccurred'))
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
        setError(t('login:errors.devLoginFailed'))
        setIsLoading(false)
        return
      }

      window.location.href = "/"
    } catch (err) {
      console.error("Dev login error:", err)
      setError(t('login:errors.devLoginFailed'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F4F8] flex flex-col items-center justify-center px-5 py-8 safe-area-inset">
      {/* Top Section */}
      <div className="flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo size={72} />
        </div>

        {/* Welcome Text */}
        <div className="text-center max-w-xs mb-10">
          <h1 className="text-2xl font-bold text-[#1C1C1E] mb-3 leading-tight">
            {t('login:welcome.title')}
          </h1>
          <p className="text-sm text-gray-600 font-normal leading-relaxed">
            {t('login:welcome.subtitle')}
          </p>
        </div>
      </div>

      {/* Bottom Section with Login Button */}
      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs text-center">
            {error}
          </div>
        )}

        {isMiniKitReady ? (
          <Button
            onClick={handleWorldcoinLogin}
            disabled={isLoading}
            variant="default"
            className="w-full py-3 px-5 bg-white hover:bg-gray-50 text-black rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            style={{
              border: '2px solid black',
              boxSizing: 'border-box'
            }}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-black"
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
                {t('common:buttons.loggingIn')}
              </>
            ) : (
              <>
                <WorldIDLogo size={18} />
                {t('login:login.withWorldId')}
              </>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleDevLogin}
              disabled={isLoading}
              variant="default"
              className="w-full py-3 px-5 bg-white hover:bg-gray-50 text-black rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              style={{
                border: '2px solid black',
                boxSizing: 'border-box'
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-black"
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
                  {t('common:buttons.loggingIn')}
                </>
              ) : (
                <span>{t('login:login.devMode')}</span>
              )}
            </Button>
            <p className="mt-4 text-center text-gray-500 text-xs leading-relaxed">
              {t('login:login.devModeNote')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
