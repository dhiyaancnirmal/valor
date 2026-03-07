"use client"

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useTranslations } from "next-intl"
import { MiniKit } from "@worldcoin/minikit-js"
import { MobileScreen, StickyActionBar } from "@/components/mobile"
import Logo from "@/components/Logo"
import WorldIDLogo from "@/components/WorldIDLogo"
import { Button } from "@/components/ui/button"
import { isDevAuthEnabled, looksLikeWorldAppUserAgent } from "@/lib/world-dev"

export function LoginPage() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMiniKitReady, setIsMiniKitReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    let tries = 0
    const MAX_TRIES = 50

    const checkMiniKit = () => {
      if (cancelled || typeof window === "undefined") return
      try {
        if (MiniKit.isInstalled()) {
          setIsMiniKitReady(true)
          return
        }
      } catch {}

      if (tries < MAX_TRIES) {
        tries += 1
        timeoutId = window.setTimeout(checkMiniKit, 150)
        return
      }

      if (looksLikeWorldAppUserAgent(navigator.userAgent || "")) {
        setIsMiniKitReady(true)
        return
      }
    }

    checkMiniKit()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  const handleWorldcoinLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!MiniKit.isInstalled()) {
        setError(t("login.errors.openInWorldApp"))
        setIsLoading(false)
        return
      }

      const nonceRes = await fetch("/api/nonce")
      if (!nonceRes.ok) {
        throw new Error(t("login.errors.initNonceFailed"))
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

      if (finalPayload.status === "error") {
        if (finalPayload.error_code === "user_rejected") {
          setIsLoading(false)
          return
        }
        setError(finalPayload.error_code || t("login.errors.authFailed"))
        setIsLoading(false)
        return
      }

      if (finalPayload.status !== "success") {
        setError(t("login.errors.invalidResponse"))
        setIsLoading(false)
        return
      }

      const walletAddress = finalPayload.address
      const signature = finalPayload.signature
      if (!walletAddress) {
        setError(t("login.errors.noWalletAddress"))
        setIsLoading(false)
        return
      }

      const userProfile = MiniKit.user
      const result = await signIn("worldcoin", {
        walletAddress,
        signature,
        message: finalPayload.message,
        nonce,
        requestId,
        statement,
        version: finalPayload.version,
        username: userProfile?.username,
        profilePictureUrl: userProfile?.profilePictureUrl,
        redirect: false,
        callbackUrl: window.location.pathname,
      })

      if (result?.error) {
        setError(`${t("login.errors.authFailed")}: ${result.error}`)
        setIsLoading(false)
        return
      }

      const redirectTo = result?.url || window.location.pathname
      window.location.replace(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errors.generic"))
      setIsLoading(false)
    }
  }

  const handleDevLogin = async () => {
    try {
      if (!isDevAuthEnabled) {
        setError(t("login.errors.devDisabled"))
        return
      }

      setIsLoading(true)
      setError(null)

      const nonceRes = await fetch("/api/nonce")
      if (!nonceRes.ok) {
        throw new Error(t("login.errors.initNonceFailed"))
      }
      const { nonce } = await nonceRes.json()

      const mockWalletAddress = `0xdev${Math.random().toString(16).substr(2, 36)}`
      const message = `Sign in to Valor\nWallet: ${mockWalletAddress}\nTimestamp: ${Date.now()}`

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
        setError(t("login.errors.devLoginFailed"))
        setIsLoading(false)
        return
      }

      window.location.replace(window.location.pathname)
    } catch {
      setError(t("login.errors.devLoginFailed"))
      setIsLoading(false)
    }
  }

  const primaryAction = isMiniKitReady ? handleWorldcoinLogin : isDevAuthEnabled ? handleDevLogin : undefined
  const primaryLabel = isMiniKitReady ? t("login.loginWithWorldID") : t("login.loginDevMode")

  return (
    <MobileScreen
      className="bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#eef7e9_32%,_#eef0f6_100%)]"
      contentClassName="overflow-hidden"
      footer={
        <StickyActionBar className="border-t-0 bg-transparent" innerClassName="px-4 pb-0 pt-0">
          <div className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            {error ? (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-left text-xs text-red-700">
                {error}
              </div>
            ) : null}

            {primaryAction ? (
              <Button
                onClick={primaryAction}
                disabled={isLoading}
                variant="default"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 px-5 py-3 text-sm text-black shadow-sm active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.96 7.96 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z" />
                    </svg>
                    {t("login.loggingIn")}
                  </>
                ) : isMiniKitReady ? (
                  <>
                    <WorldIDLogo size={18} />
                    {primaryLabel}
                  </>
                ) : (
                  <span>{primaryLabel}</span>
                )}
              </Button>
            ) : (
              <div className="rounded-2xl border border-black/5 bg-[var(--valor-bg-soft)] px-4 py-3 text-center text-sm text-gray-600">
                {t("login.openInWorldApp")}
              </div>
            )}

            {!isMiniKitReady ? (
              <p className="mt-3 text-center text-xs text-gray-500">{t("login.openInWorldApp")}</p>
            ) : null}
          </div>
        </StickyActionBar>
      }
    >
      <div className="flex h-full flex-col justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1.75rem)]">
        <div className="flex flex-1 flex-col justify-center pb-8 pt-6">
          <div className="mx-auto flex max-w-xs flex-col items-center text-center">
            <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/70 bg-white/80 shadow-[0_18px_44px_rgba(15,23,42,0.1)]">
              <Logo size={64} />
            </div>
            <h1 className="text-[2rem] leading-[1.05] text-[#1C1C1E]">{t("login.welcome")}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">{t("login.tagline")}</p>
          </div>
        </div>

      </div>
    </MobileScreen>
  )
}
