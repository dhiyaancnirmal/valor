"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { Loader2, Settings } from "lucide-react"
import { MiniKit } from "@worldcoin/minikit-js"
import type { Abi } from "viem"

interface AccruedRewards {
  totalAccrued: string
  totalUSDC: number
  submissionCount: number
}

interface WalletTabProps {
  onOpenSettings: () => void
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

export function WalletTab({ onOpenSettings }: WalletTabProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const [accruedRewards, setAccruedRewards] = useState<AccruedRewards | null>(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Helper function to get user initials for fallback
  const getUserInitials = (username?: string) => {
    if (!username) return "?"
    return username.slice(0, 2).toUpperCase()
  }

  // Helper function to format wallet address
  const formatWalletAddress = (address?: string) => {
    if (!address) return "Not connected"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    if (session?.user?.walletAddress) {
      setIsLoadingRewards(true)
      fetch('/api/wallet/rewards')
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error('Error fetching rewards:', data.error)
            setAccruedRewards(null)
          } else {
            // Ensure all values are properly set with defaults
            setAccruedRewards({
              totalAccrued: data.totalAccrued || '0',
              totalUSDC: typeof data.totalUSDC === 'number' && !isNaN(data.totalUSDC) ? data.totalUSDC : 0,
              submissionCount: typeof data.submissionCount === 'number' && !isNaN(data.submissionCount) ? Math.max(0, Math.floor(data.submissionCount)) : 0,
            })
          }
        })
        .catch(error => {
          console.error('Error fetching rewards:', error)
          setAccruedRewards(null)
        })
        .finally(() => {
          setIsLoadingRewards(false)
        })
    } else {
      setIsLoadingRewards(false)
      setAccruedRewards(null)
    }
  }, [session?.user?.walletAddress])

  // Memoize the formatted submission count to prevent re-renders
  const formattedSubmissionCount = useMemo(() => {
    if (isLoadingRewards) {
      return '0'
    }
    const count = accruedRewards?.submissionCount
    if (count === undefined || count === null) {
      return '0'
    }
    const num = typeof count === 'number' && !isNaN(count) && isFinite(count) 
      ? Math.max(0, Math.floor(count)) 
      : 0
    // Ensure we always return a clean string representation
    return String(num)
  }, [isLoadingRewards, accruedRewards?.submissionCount])

  return (
    <div className="h-full bg-[#F4F4F8] overflow-hidden flex flex-col">
      {/* Header with settings button */}
      <div style={{ padding: 'var(--spacing-md)', paddingLeft: 'calc(env(safe-area-inset-left, 0px) + var(--spacing-md))', paddingRight: 'calc(env(safe-area-inset-right, 0px) + var(--spacing-md))', flexShrink: 0 }}>
        <div className="flex items-center justify-end">
          {/* Settings Icon */}
          <button
            className="w-10 h-10 flex items-center justify-center cursor-pointer bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all hover:scale-105 active:scale-95"
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-[#1C1C1E]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="flex-shrink-0 relative flex flex-col items-center justify-center px-6 py-2">
        {/* Profile Picture */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7DD756] to-[#5FB840] shadow-lg flex items-center justify-center overflow-hidden mb-2">
          {session?.user?.profilePictureUrl ? (
            <img 
              src={session.user.profilePictureUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div className={`${session?.user?.profilePictureUrl ? 'hidden' : ''} text-white text-2xl font-bold`}>
            {getUserInitials(session?.user?.username)}
          </div>
        </div>

        {/* Username */}
        <h2 className="text-lg font-bold text-[#1C1C1E] mb-1">
          {session?.user?.username || "Anonymous User"}
        </h2>

        {/* Wallet Address */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-3 py-1">
          <p className="text-xs text-[#1C1C1E] font-mono">
            {formatWalletAddress(session?.user?.walletAddress)}
          </p>
        </div>
      </div>

      {/* Token Balance - Large centered display */}
      <div style={{ padding: 'var(--spacing-sm) 10px' }} className="bg-white/10 backdrop-blur-sm flex-shrink-0">
        <div className="text-center">
          {isLoadingRewards ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="w-8 h-8 text-[#1C1C1E] animate-spin" />
            </div>
          ) : (
            <div className="text-[3rem] sm:text-[3.5rem] font-bold text-[#1C1C1E] tracking-tight leading-none whitespace-nowrap overflow-hidden">
              {accruedRewards?.totalUSDC.toFixed(2) || '0.00'} <span className="text-[1.5rem] sm:text-[2rem] text-[#1C1C1E]/70">USDC</span>
            </div>
          )}
        </div>
      </div>

      {/* Submission Streak Counter */}
      <div style={{ padding: 'var(--spacing-md)' }} className="flex-shrink-0">
        <div className="bg-white/20 backdrop-blur-md border border-white/30" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)' }}>
          <div className="text-center">
            <div className="text-xl font-bold text-[#1C1C1E] tabular-nums">
              {isLoadingRewards ? (
                <span className="opacity-50">0</span>
              ) : (
                <span>{formattedSubmissionCount}</span>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {t('walletTab.submissions')}
            </div>
          </div>
        </div>
      </div>

      {/* Claim Button - Always visible */}
      <div className="flex-1 flex flex-col justify-end" style={{ padding: 'var(--spacing-md)', paddingBottom: 'var(--spacing-lg)' }}>
        {!isLoadingRewards && (
          <>
            <button
              onClick={handleClaimRewards}
              disabled={isClaiming || !MiniKit.isInstalled() || !accruedRewards || accruedRewards.totalUSDC === 0}
              className={`w-full font-bold py-3 px-6 rounded-2xl shadow-lg transition-all ${
                accruedRewards && accruedRewards.totalUSDC > 0 && !isClaiming && MiniKit.isInstalled()
                  ? 'bg-gradient-to-r from-[#7DD756] to-[#5FB840] text-white hover:scale-105 active:scale-95'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              {isClaiming ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Claiming...</span>
                </div>
              ) : accruedRewards && accruedRewards.totalUSDC > 0 ? (
                <span>Claim {accruedRewards.totalUSDC.toFixed(2)} USDC</span>
              ) : (
                <span>No rewards to claim</span>
              )}
            </button>
            {claimError && (
              <p className="text-red-500 text-xs text-center mt-1">{claimError}</p>
            )}
            {!MiniKit.isInstalled() && (
              <p className="text-gray-500 text-xs text-center mt-1">
                Please open in World App to claim rewards
              </p>
            )}
            {accruedRewards && accruedRewards.totalUSDC > 0 && (
              <p className="text-center text-xs text-gray-600 mt-1">
                {t('time.payoutSchedule')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )

  async function handleClaimRewards() {
    if (!MiniKit.isInstalled()) {
      setClaimError("Please open this app in World App to claim rewards")
      return
    }

    setIsClaiming(true)
    setClaimError(null)

    try {
      // Step 1: Get transaction data from backend
      const prepareResponse = await fetch('/api/prepare-claim')
      const prepareData = (await prepareResponse.json()) as PrepareClaimResponse

      if (!prepareData.success || !prepareData.transactions || prepareData.transactions.length === 0) {
        setClaimError(prepareData.error || "No rewards available to claim")
        setIsClaiming(false)
        return
      }

      console.log(`Preparing to claim ${prepareData.transactions.length} rewards`)

      // Step 2: Execute transaction using MiniKit
      // MiniKit supports batching multiple transactions
      // According to Worldcoin docs, all args must be strings
      // MiniKit will auto-format them, so we keep them as strings
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: prepareData.transactions.map((tx: PreparedClaimTx) => ({
          address: tx.address,
          abi: tx.abi,
          functionName: tx.functionName,
          args: tx.args, // Keep args as strings - MiniKit will handle formatting
        })),
      })

      if (finalPayload.status === 'error') {
        // Don't show error for user rejection - this is normal behavior
        if (finalPayload.error_code === 'user_rejected') {
          setIsClaiming(false)
          return
        }
        console.error("Transaction error:", finalPayload)
        
        // Provide helpful error message for invalid_contract
        if (finalPayload.error_code === 'invalid_contract') {
          setClaimError("Contract not whitelisted. Please whitelist the RewardVault contract in the Worldcoin Developer Portal.")
        } else {
          setClaimError(finalPayload.error_code || "Transaction failed")
        }
        setIsClaiming(false)
        return
      }

      if (finalPayload.status !== 'success') {
        console.error("Transaction failed:", finalPayload)
        setClaimError("Transaction failed. Please try again.")
        setIsClaiming(false)
        return
      }

      console.log("Transaction successful:", finalPayload)

      // Step 3: Confirm transaction on backend and update database
      // Extract transaction hash from finalPayload (MiniKit response structure)
      const payload = finalPayload as MiniKitPayload
      const txHash = payload.txHash || payload.hash || payload.transactionHash || ''
      
      if (!txHash) {
        console.error("No transaction hash in response:", finalPayload)
        setClaimError("Transaction succeeded but no hash received. Please contact support.")
        setIsClaiming(false)
        return
      }

      const confirmResponse = await fetch('/api/confirm-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: prepareData.transactionIds,
          txHash,
        }),
      })

      const confirmData = (await confirmResponse.json()) as ConfirmClaimResponse

      if (!confirmData.success) {
        console.error("Failed to confirm transaction:", confirmData)
        setClaimError("Transaction succeeded but failed to update records. Please contact support.")
        setIsClaiming(false)
        return
      }

      // Step 4: Refresh rewards display
      setIsClaiming(false)
      setClaimError(null)
      
      // Refresh rewards
      if (session?.user?.walletAddress) {
        const rewardsResponse = await fetch('/api/wallet/rewards')
        const rewardsData = await rewardsResponse.json()
        if (!rewardsData.error) {
          setAccruedRewards({
            totalAccrued: rewardsData.totalAccrued || '0',
            totalUSDC: typeof rewardsData.totalUSDC === 'number' && !isNaN(rewardsData.totalUSDC) ? rewardsData.totalUSDC : 0,
            submissionCount: typeof rewardsData.submissionCount === 'number' && !isNaN(rewardsData.submissionCount) ? Math.max(0, Math.floor(rewardsData.submissionCount)) : 0,
          })
        }
      }
    } catch (error: unknown) {
      console.error("Claim error:", error)
      setClaimError(error instanceof Error ? error.message : "Failed to claim rewards. Please try again.")
      setIsClaiming(false)
    }
  }
}
