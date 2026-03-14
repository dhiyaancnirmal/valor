"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { Loader2, Settings } from "lucide-react"
import { MiniKit } from "@worldcoin/minikit-js"
import type { Abi } from "viem"
import { StickyActionBar } from "@/components/mobile"
import { isWorldDevBypassEnabled } from "@/lib/world-dev"
import type { PoiProposal } from "@/types"

interface AccruedRewards {
  totalAccrued: string
  totalUSDC: number
  submissionCount: number
}

interface WalletTabProps {
  onOpenSettings: () => void
  captureMode?: boolean
}

interface PreparedClaimTx {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args: string[]
}

interface PrepareClaimResponse {
  success?: boolean
  error?: string
  transactions?: PreparedClaimTx[]
  transactionIds?: string[]
}

interface ConfirmClaimResponse {
  success?: boolean
  error?: string
}

interface MiniKitPayload {
  status?: string
  error_code?: string
  txHash?: string
  hash?: string
  transactionHash?: string
}

export function WalletTab({ onOpenSettings, captureMode = false }: WalletTabProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const [accruedRewards, setAccruedRewards] = useState<AccruedRewards | null>(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [proposals, setProposals] = useState<PoiProposal[]>([])
  const [isLoadingProposals, setIsLoadingProposals] = useState(true)
  const miniKitInstalled = (() => {
    try {
      return MiniKit.isInstalled()
    } catch {
      return false
    }
  })()
  const canUseClaimFlow = miniKitInstalled || isWorldDevBypassEnabled

  const displayName = captureMode
    ? "Valor Builder"
    : session?.user?.username || t("walletTab.anonymousUser")

  const formattedWalletAddress = useMemo(() => {
    const address = session?.user?.walletAddress
    if (!address) return t("walletTab.notConnected")
    if (captureMode) return "0xA11C...E42F"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [captureMode, session?.user?.walletAddress, t])

  const formattedSubmissionCount = useMemo(() => {
    if (isLoadingRewards) return "0"
    const count = accruedRewards?.submissionCount
    if (typeof count !== "number" || Number.isNaN(count)) return "0"
    return String(Math.max(0, Math.floor(count)))
  }, [accruedRewards?.submissionCount, isLoadingRewards])

  const proposalStatusLabel = useMemo(
    () => ({
      published: t("walletTab.proposalStatuses.published"),
      rejected: t("walletTab.proposalStatuses.rejected"),
      pending: t("walletTab.proposalStatuses.pending"),
    }),
    [t]
  )

  useEffect(() => {
    if (!session?.user?.walletAddress) {
      setAccruedRewards(null)
      setIsLoadingRewards(false)
      return
    }

    const controller = new AbortController()

    const fetchRewards = async () => {
      setIsLoadingRewards(true)
      try {
        const response = await fetch("/api/wallet/rewards", { signal: controller.signal })
        const data = await response.json()
        if (data.error) {
          console.error("Error fetching rewards:", data.error)
          setAccruedRewards(null)
          return
        }
        setAccruedRewards({
          totalAccrued: data.totalAccrued || "0",
          totalUSDC: typeof data.totalUSDC === "number" && !Number.isNaN(data.totalUSDC) ? data.totalUSDC : 0,
          submissionCount:
            typeof data.submissionCount === "number" && !Number.isNaN(data.submissionCount)
              ? Math.max(0, Math.floor(data.submissionCount))
              : 0,
        })
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching rewards:", error)
          setAccruedRewards(null)
        }
      } finally {
        setIsLoadingRewards(false)
      }
    }

    void fetchRewards()

    return () => controller.abort()
  }, [session?.user?.walletAddress])

  useEffect(() => {
    if (!session?.user?.walletAddress) {
      setProposals([])
      setIsLoadingProposals(false)
      return
    }

    const controller = new AbortController()

    const fetchProposals = async () => {
      setIsLoadingProposals(true)
      try {
        const response = await fetch("/api/pois/proposals/mine", { signal: controller.signal })
        const data = (await response.json()) as { proposals?: PoiProposal[]; error?: string }
        if (data.error) {
          console.error("Error fetching proposals:", data.error)
          setProposals([])
          return
        }
        setProposals(data.proposals ?? [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching proposals:", error)
          setProposals([])
        }
      } finally {
        setIsLoadingProposals(false)
      }
    }

    void fetchProposals()

    return () => controller.abort()
  }, [session?.user?.walletAddress])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--valor-bg)]">
      <div className="safe-px-app flex shrink-0 items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">{t("mainUI.tabs.wallet")}</p>
          <h1 className="mt-2 text-2xl text-[#1C1C1E]">{displayName}</h1>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("settings.title")}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[#1C1C1E] shadow-sm active:scale-95"
        >
          <Settings className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="flex flex-col gap-4 pb-6">
          <section className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--valor-green)] to-[var(--valor-green-dark)] text-2xl text-white shadow-sm ring-4 ring-white/70">
                {session?.user?.profilePictureUrl && !captureMode ? (
                  <img
                    src={session.user.profilePictureUrl}
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                    onError={(event) => {
                      const target = event.target as HTMLImageElement
                      target.style.display = "none"
                      target.nextElementSibling?.classList.remove("hidden")
                    }}
                  />
                ) : null}
                <div className={`${session?.user?.profilePictureUrl ? "hidden" : ""}`}>
                  {(session?.user?.username || "?").slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">{t("walletTab.walletAddress")}</p>
                <p className="mt-2 truncate rounded-full bg-[var(--valor-bg-soft)] px-3 py-2 font-mono text-xs text-[#1C1C1E]">
                  {formattedWalletAddress}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">{t("walletTab.totalBalance")}</p>
            <div className="mt-3 text-[3rem] leading-none text-[#1C1C1E]">
              {isLoadingRewards ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1C1C1E]" />
                </div>
              ) : (
                <>
                  {accruedRewards?.totalUSDC.toFixed(2) || "0.00"}
                  <span className="ml-2 text-[1.4rem] text-[#1C1C1E]/65">USDC</span>
                </>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">{t("walletTab.submissions")}</p>
              <p className="mt-2 text-2xl text-[#1C1C1E]">{formattedSubmissionCount}</p>
            </div>
            <div className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">{t("walletTab.myProposals")}</p>
              <p className="mt-2 text-2xl text-[#1C1C1E]">{proposals.length}</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/5 bg-white px-4 py-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base text-[#1C1C1E]">{t("walletTab.myProposals")}</h2>
              <span className="rounded-full bg-[var(--valor-bg-soft)] px-2 py-1 text-[11px] text-gray-500">{proposals.length}</span>
            </div>

            {isLoadingProposals ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </div>
            ) : proposals.length === 0 ? (
              <p className="text-sm text-gray-500">{t("walletTab.noProposals")}</p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {proposals.slice(0, 8).map((proposal) => (
                  <div key={proposal.id} className="rounded-2xl border border-black/5 bg-[var(--valor-bg)] px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm text-[#1C1C1E]">{proposal.name}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${
                          proposal.status === "published"
                            ? "bg-green-100 text-green-700"
                            : proposal.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {proposalStatusLabel[proposal.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">{proposal.address || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <StickyActionBar innerClassName="flex flex-col gap-3 px-4 pt-3">
        {!isLoadingRewards ? (
          <>
            <button
              type="button"
              onClick={handleClaimRewards}
              disabled={isClaiming || !canUseClaimFlow || !accruedRewards || accruedRewards.totalUSDC === 0}
              className={`min-h-12 rounded-2xl px-5 text-sm text-white shadow-sm transition-transform active:scale-[0.99] ${
                accruedRewards && accruedRewards.totalUSDC > 0 && !isClaiming && canUseClaimFlow
                  ? "bg-gradient-to-r from-[var(--valor-green)] to-[var(--valor-green-dark)]"
                  : "bg-gray-300 text-gray-500"
              }`}
            >
              {isClaiming ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("walletTab.settling")}</span>
                </span>
              ) : accruedRewards && accruedRewards.totalUSDC > 0 ? (
                <span>{t("walletTab.settleBalance", { amount: accruedRewards.totalUSDC.toFixed(2) })}</span>
              ) : (
                <span>{t("walletTab.noBalanceToSettle")}</span>
              )}
            </button>
            {claimError ? <p className="text-center text-xs text-red-500">{claimError}</p> : null}
            {!miniKitInstalled && !isWorldDevBypassEnabled ? (
              <p className="text-center text-xs text-gray-500">{t("walletTab.openInWorldAppToSettle")}</p>
            ) : null}
            {accruedRewards && accruedRewards.totalUSDC > 0 ? (
              <p className="text-center text-xs text-gray-500">{t("time.payoutSchedule")}</p>
            ) : null}
          </>
        ) : null}
      </StickyActionBar>

    </div>
  )

  async function handleClaimRewards() {
    if (!miniKitInstalled) {
      if (!isWorldDevBypassEnabled) {
        setClaimError(t("walletTab.openInWorldAppToSettle"))
        return
      }

      const availableRewards = accruedRewards?.totalUSDC ?? 0
      if (availableRewards <= 0) {
        setClaimError(t("walletTab.noBalanceToSettle"))
        return
      }

      setIsClaiming(true)
      setClaimError(null)
      await new Promise((resolve) => setTimeout(resolve, 900))
      setAccruedRewards((current) =>
        current
          ? {
              ...current,
              totalUSDC: 0,
              totalAccrued: "0",
            }
          : current
      )
      setIsClaiming(false)
      return
    }

    setIsClaiming(true)
    setClaimError(null)

    try {
      const prepareResponse = await fetch("/api/prepare-claim")
      const prepareData = (await prepareResponse.json()) as PrepareClaimResponse

      if (!prepareData.success || !prepareData.transactions || prepareData.transactions.length === 0) {
        setClaimError(prepareData.error || t("walletTab.noBalanceToSettle"))
        setIsClaiming(false)
        return
      }

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: prepareData.transactions.map((transaction: PreparedClaimTx) => ({
          address: transaction.address,
          abi: transaction.abi,
          functionName: transaction.functionName,
          args: transaction.args,
        })),
      })

      if (finalPayload.status === "error") {
        if (finalPayload.error_code === "user_rejected") {
          setIsClaiming(false)
          return
        }
        if (finalPayload.error_code === "invalid_contract") {
          setClaimError(t("walletTab.claimErrors.invalidContract"))
        } else {
          setClaimError(finalPayload.error_code || t("walletTab.claimErrors.transactionFailed"))
        }
        setIsClaiming(false)
        return
      }

      if (finalPayload.status !== "success") {
        setClaimError(t("walletTab.claimErrors.transactionRetry"))
        setIsClaiming(false)
        return
      }

      const payload = finalPayload as MiniKitPayload
      const txHash = payload.txHash || payload.hash || payload.transactionHash || ""
      if (!txHash) {
        setClaimError(t("walletTab.claimErrors.missingHash"))
        setIsClaiming(false)
        return
      }

      const confirmResponse = await fetch("/api/confirm-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionIds: prepareData.transactionIds,
          txHash,
        }),
      })
      const confirmData = (await confirmResponse.json()) as ConfirmClaimResponse

      if (!confirmData.success) {
        setClaimError(t("walletTab.claimErrors.confirmFailed"))
        setIsClaiming(false)
        return
      }

      setIsClaiming(false)
      setClaimError(null)

      if (session?.user?.walletAddress) {
        const rewardsResponse = await fetch("/api/wallet/rewards")
        const rewardsData = await rewardsResponse.json()
        if (!rewardsData.error) {
          setAccruedRewards({
            totalAccrued: rewardsData.totalAccrued || "0",
            totalUSDC:
              typeof rewardsData.totalUSDC === "number" && !Number.isNaN(rewardsData.totalUSDC)
                ? rewardsData.totalUSDC
                : 0,
            submissionCount:
              typeof rewardsData.submissionCount === "number" && !Number.isNaN(rewardsData.submissionCount)
                ? Math.max(0, Math.floor(rewardsData.submissionCount))
                : 0,
          })
        }
      }
    } catch (error: unknown) {
      console.error("Claim error:", error)
      setClaimError(error instanceof Error ? error.message : t("walletTab.claimErrors.settleFailed"))
      setIsClaiming(false)
    }
  }
}
