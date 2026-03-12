"use client"

import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, Loader2 } from "lucide-react"
import { MiniKit, type ISuccessResult, VerificationLevel } from "@worldcoin/minikit-js"
import { useTranslations } from "next-intl"
import { BottomSheet, StickyActionBar } from "@/components/mobile"
import { isWorldDevBypassEnabled } from "@/lib/world-dev"

type VerificationReason = "submit_price" | "add_store" | "general"

interface WorldIdVerificationSheetProps {
  isOpen: boolean
  onClose: () => void
  onVerified?: () => void | Promise<void>
  reason?: VerificationReason
  action?: string
}

function describeVerifyError(code: string) {
  switch (code) {
    case "invalid_network":
      return "World App rejected this verification because the app environment does not match the current network."
    case "credential_unavailable":
      return "The requested credential is not available for this account at the required verification level."
    case "inclusion_proof_pending":
      return "World ID proof generation is still pending. Try again shortly."
    case "inclusion_proof_failed":
      return "World App could not retrieve the inclusion proof. This is usually a temporary sequencer or network issue. Try again."
    case "malformed_request":
      return "The verification request sent by the app is malformed."
    case "max_verifications_reached":
      return "This action has already been verified the maximum number of times."
    case "verification_rejected":
    case "user_rejected":
      return "Verification was canceled in World App."
    default:
      return `World ID verification failed (${code}).`
  }
}

export function WorldIdVerificationSheet({
  isOpen,
  onClose,
  onVerified,
  reason = "general",
  action,
}: WorldIdVerificationSheetProps) {
  const t = useTranslations()
  const [isPreparing, setIsPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
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
      const resolvedAction = action?.trim()
      if (!resolvedAction) {
        throw new Error(t("worldId.errors.prepareFailed"))
      }

      if (isWorldDevBypassEnabled) {
        const response = await fetch("/api/world-id/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: {
              proof: "dev-proof",
              merkle_root: "dev-root",
              nullifier_hash: "dev-nullifier",
              verification_level: VerificationLevel.Orb,
            },
            action: resolvedAction,
            signal: undefined,
          }),
        })
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          throw new Error(data?.error || t("worldId.errors.verifyFailed"))
        }
        await onVerified?.()
        onClose()
        return
      }

      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: resolvedAction,
        verification_level: [VerificationLevel.Orb, VerificationLevel.Device],
      })

      if (finalPayload.status === "error") {
        console.warn("World ID verify rejected in MiniKit", finalPayload)
        if (
          finalPayload.error_code === "user_rejected" ||
          finalPayload.error_code === "verification_rejected"
        ) {
          return
        }
        throw new Error(describeVerifyError(finalPayload.error_code || "unknown"))
      }

      const verificationPayload: ISuccessResult | undefined =
        "verifications" in finalPayload
          ? finalPayload.verifications.find((item) => item.verification_level === VerificationLevel.Orb)
            || finalPayload.verifications.find((item) => item.verification_level === VerificationLevel.Device)
            || finalPayload.verifications[0]
          : finalPayload

      if (!verificationPayload) {
        throw new Error(t("worldId.errors.verifyFailed"))
      }

      const response = await fetch("/api/world-id/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: verificationPayload,
          action: resolvedAction,
          signal: undefined,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
          providerStatus?: number
          providerPayload?: { code?: string; detail?: string }
        } | null

        const providerCode = data?.providerPayload?.code
        const providerDetail = data?.providerPayload?.detail
        throw new Error(
          providerDetail ||
          (providerCode ? describeVerifyError(providerCode) : undefined) ||
          data?.error ||
          t("worldId.errors.verifyFailed")
        )
      }

      await onVerified?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("worldId.errors.verifyFailed"))
    } finally {
      setIsPreparing(false)
    }
  }

  return (
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
  )
}
