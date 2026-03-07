"use client"

import { useEffect, useMemo, useState } from "react"
import { IDKitRequestWidget, deviceLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit"
import { BadgeCheck, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { BottomSheet, StickyActionBar } from "@/components/mobile"

type VerificationReason = "submit_price" | "add_store" | "general"

type RpContextPayload = {
  appId: `app_${string}`
  action: string
  environment: "production" | "staging"
  allowLegacyProofs: boolean
  rpContext: RpContext
}

interface WorldIdVerificationSheetProps {
  isOpen: boolean
  onClose: () => void
  onVerified?: () => void | Promise<void>
  reason?: VerificationReason
}

export function WorldIdVerificationSheet({
  isOpen,
  onClose,
  onVerified,
  reason = "general",
}: WorldIdVerificationSheetProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [contextPayload, setContextPayload] = useState<RpContextPayload | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setWidgetOpen(false)
      setContextPayload(null)
      setError(null)
      setIsPreparing(false)
    }
  }, [isOpen])

  const copy = useMemo(() => {
    switch (reason) {
      case "submit_price":
        return {
          title: t("worldId.verifyToSubmitTitle"),
          description: t("worldId.verifyToSubmitDescription"),
        }
      case "add_store":
        return {
          title: t("worldId.verifyToAddStoreTitle"),
          description: t("worldId.verifyToAddStoreDescription"),
        }
      default:
        return {
          title: t("worldId.verifyTitle"),
          description: t("worldId.verifyDescription"),
        }
    }
  }, [reason, t])

  const handleStartVerification = async () => {
    setIsPreparing(true)
    setError(null)

    try {
      const response = await fetch("/api/world-id/rp-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as RpContextPayload & { error?: string }
      if (!response.ok || data.error) {
        throw new Error(data.error || t("worldId.errors.prepareFailed"))
      }

      setContextPayload(data)
      setWidgetOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("worldId.errors.prepareFailed"))
    } finally {
      setIsPreparing(false)
    }
  }

  const handleVerify = async (result: IDKitResult) => {
    const response = await fetch("/api/world-id/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idkitResponse: result }),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error || t("worldId.errors.verifyFailed"))
    }
  }

  const handleSuccess = async () => {
    await onVerified?.()
    onClose()
  }

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={copy.title}
        description={copy.description}
        closeLabel={t("common.close")}
        header={
          <div className="pr-12">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--valor-bg-soft)] text-[#1C1C1E]">
                <BadgeCheck className="h-6 w-6 text-[var(--valor-green-dark)]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl text-[#1C1C1E]">{copy.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{copy.description}</p>
              </div>
            </div>
          </div>
        }
        footer={
          <StickyActionBar className="border-t border-black/5 bg-white" innerClassName="px-4 pt-3">
            <button
              type="button"
              onClick={handleStartVerification}
              disabled={isPreparing}
              className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-[var(--valor-green)] to-[var(--valor-green-dark)] px-4 text-sm text-white active:scale-[0.99] disabled:opacity-60"
            >
              {isPreparing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("worldId.preparing")}</span>
                </span>
              ) : (
                t("worldId.cta")
              )}
            </button>
          </StickyActionBar>
        }
        bodyClassName="gap-4"
      >
        <section className="rounded-3xl border border-black/5 bg-[var(--valor-bg)] p-4 text-sm leading-6 text-gray-600">
          <p>{t("worldId.privacy")}</p>
        </section>
        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}
      </BottomSheet>

      {contextPayload ? (
        <IDKitRequestWidget
          open={widgetOpen}
          onOpenChange={setWidgetOpen}
          app_id={contextPayload.appId}
          action={contextPayload.action}
          rp_context={contextPayload.rpContext}
          allow_legacy_proofs={contextPayload.allowLegacyProofs}
          environment={contextPayload.environment}
          language={locale.startsWith("es") ? "es" : "en"}
          preset={deviceLegacy()}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={(errorCode) => {
            if (errorCode) {
              setError(t("worldId.errors.flowFailed", { code: errorCode }))
            }
          }}
        />
      ) : null}
    </>
  )
}
