"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { signIn } from "next-auth/react"
import { MiniKit } from "@worldcoin/minikit-js"
import { Button } from "@/components/ui/button"
import Logo from "@/components/Logo"
import WorldIDLogo from "@/components/WorldIDLogo"
import { isDevAuthEnabled } from "@/lib/world-dev"

export function LoginPage() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMiniKitReady, setIsMiniKitReady] = useState(false)

  useEffect(() => {
    // Check if MiniKit is available after component mounts
    const checkMiniKit = () => {
      if (typeof window !== "undefined") {
        const isInstalled = MiniKit.isInstalled()
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

      // Check if MiniKit is available
      if (!MiniKit.isInstalled()) {
        setError(t('login.errors.openInWorldApp'))
        setIsLoading(false)
        return
      }

      // Use async walletAuth command as per documentation
      const nonceRes = await fetch("/api/nonce")
      if (!nonceRes.ok) {
        throw new Error("Failed to initialize sign-in nonce")
      }
      const { nonce } = await nonceRes.json()
      const requestId = "wallet-auth-v1"
      const statement = t("login.signInStatement")

      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId,
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now()),
        statement,
      })

      if (finalPayload.status === 'error') {
        // Don't show error for user rejection - this is normal behavior
        if (finalPayload.error_code === 'user_rejected') {
          setIsLoading(false)
          return
        }
        setError(finalPayload.error_code || t('login.errors.authFailed'))
        setIsLoading(false)
        return
      }

      if (finalPayload.status !== 'success') {
        setError(t('login.errors.invalidResponse'))
        setIsLoading(false)
        return
      }

      // Extract wallet address and signature from finalPayload
      const walletAddress = finalPayload.address
      const signature = finalPayload.signature

      if (!walletAddress) {
        setError(t('login.errors.noWalletAddress'))
        setIsLoading(false)
        return
      }

      // Get user profile data from MiniKit after successful auth
      const userProfile = MiniKit.user

      // Use the message from the finalPayload (SIWE message)
      const message = finalPayload.message

      // Sign in with NextAuth
      const result = await signIn("worldcoin", {
        walletAddress,
        signature,
        message,
        nonce,
        requestId,
        statement,
        version: finalPayload.version,
        username: userProfile?.username,
        profilePictureUrl: userProfile?.profilePictureUrl,
        redirect: false,
      })

      if (result?.error) {
        setError(`${t('login.errors.authFailed')}: ${result.error}`)
        setIsLoading(false)
        return
      }

      // Success - redirect to home
      window.location.href = "/"
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errors.generic'))
      setIsLoading(false)
    }
  }

  const handleDevLogin = async () => {
    try {
      if (!isDevAuthEnabled) {
        setError("Dev login is disabled")
        return
      }
      setIsLoading(true)
      setError(null)

      const nonceRes = await fetch("/api/nonce")
      if (!nonceRes.ok) {
        throw new Error("Failed to initialize dev sign-in nonce")
      }
      const { nonce } = await nonceRes.json()

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
        nonce,
        redirect: false,
      })

      if (result?.error) {
        setError(t('login.errors.devLoginFailed'))
        setIsLoading(false)
        return
      }

      window.location.href = "/"
    } catch (err) {
      setError(t('login.errors.devLoginFailed'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/80 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-sm px-6 py-9">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-7">
            <Logo size={64} />
          </div>

          <div className="text-center max-w-xs mb-8">
            <h1 className="text-2xl font-extrabold text-[#1C1C1E] mb-2.5 leading-tight">
              {t('login.welcome')}
            </h1>
            <p className="text-sm text-gray-600 font-normal leading-relaxed">
              {t('login.tagline')}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
            {error}
          </div>
        )}

        {isMiniKitReady ? (
          <Button
            onClick={handleWorldcoinLogin}
            disabled={isLoading}
            variant="default"
            className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            style={{
              border: '1px solid rgba(15, 23, 42, 0.18)',
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
                {t('login.loggingIn')}
              </>
            ) : (
              <>
                <WorldIDLogo size={18} />
                {t('login.loginWithWorldID')}
              </>
            )}
          </Button>
        ) : isDevAuthEnabled ? (
          <>
            <Button
              onClick={handleDevLogin}
              disabled={isLoading}
              variant="default"
              className="w-full py-3.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              style={{
                border: '1px solid rgba(15, 23, 42, 0.18)',
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
                  {t('login.loggingIn')}
                </>
              ) : (
                <span>{t('login.loginDevMode')}</span>
              )}
            </Button>
            <p className="mt-4 text-center text-gray-500 text-xs leading-relaxed">
              {t('login.openInWorldApp')}
            </p>
          </>
        ) : (
          <p className="mt-4 text-center text-gray-500 text-xs leading-relaxed">
            {t('login.openInWorldApp')}
          </p>
        )}

        <p className="mt-5 text-center text-[11px] text-gray-500 leading-relaxed">
          Built for World App mini-app flows with secure wallet sign-in.
        </p>
      </div>
    </div>
  )
}
