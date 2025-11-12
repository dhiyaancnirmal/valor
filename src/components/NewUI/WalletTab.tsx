"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useSession, signOut } from "next-auth/react"
import { Loader2, Star, Settings } from "lucide-react"

interface AccruedRewards {
  totalAccrued: string
  totalUSDC: number
  submissionCount: number
}

interface WalletTabProps {
  onOpenSettings: () => void
}

export function WalletTab({ onOpenSettings }: WalletTabProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const [accruedRewards, setAccruedRewards] = useState<AccruedRewards | null>(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(true)

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
            setAccruedRewards(data)
          }
        })
        .catch(error => {
          console.error('Error fetching rewards:', error)
          setAccruedRewards(null)
        })
        .finally(() => {
          setIsLoadingRewards(false)
        })
    }
  }, [session?.user?.walletAddress])

  return (
    <div className="h-full bg-[#F4F4F8] overflow-y-auto pb-24">
      {/* Header with settings button */}
      <div style={{ padding: 'var(--spacing-xl)', paddingLeft: 'calc(env(safe-area-inset-left, 0px) + var(--spacing-xl))', paddingRight: 'calc(env(safe-area-inset-right, 0px) + var(--spacing-xl))' }}>
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
      <div className="h-80 relative flex flex-col items-center justify-center px-6">
        {/* Profile Picture */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#7DD756] to-[#5FB840] shadow-lg flex items-center justify-center overflow-hidden mb-4">
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
          <div className={`${session?.user?.profilePictureUrl ? 'hidden' : ''} text-white text-4xl font-bold`}>
            {getUserInitials(session?.user?.username)}
          </div>
        </div>

        {/* Username */}
        <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
          {session?.user?.username || "Anonymous User"}
        </h2>

        {/* Wallet Address */}
        <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2">
          <p className="text-sm text-[#1C1C1E] font-mono">
            {formatWalletAddress(session?.user?.walletAddress)}
          </p>
        </div>
      </div>

      {/* Token Balance - Large centered display */}
      <div style={{ padding: 'var(--spacing-sm) 10px' }} className="bg-white/10 backdrop-blur-sm">
        <div className="text-center">
          {isLoadingRewards ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-12 h-12 text-[#1C1C1E] animate-spin" />
            </div>
          ) : (
            <div className="text-[4rem] sm:text-[5rem] md:text-[6rem] font-bold text-[#1C1C1E] tracking-tight leading-none whitespace-nowrap overflow-hidden">
              {accruedRewards?.totalUSDC.toFixed(2) || '0.00'} <span className="text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] text-[#1C1C1E]/70">USDC</span>
            </div>
          )}
        </div>
      </div>

      {/* Submission Streak Counter */}
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <div className="bg-white/20 backdrop-blur-md border border-white/30" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-lg)' }}>
          <div className="flex items-center justify-center" style={{ gap: 'var(--spacing-md)' }}>
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-[#1C1C1E]" strokeWidth={2} fill="currentColor" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1C1C1E]">
                {accruedRewards?.submissionCount || 0}
              </div>
              <div className="text-sm text-gray-600">
                {t('walletTab.submissions')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional info if needed */}
      {accruedRewards && accruedRewards.totalUSDC > 0 && (
        <div style={{ padding: '0 var(--spacing-xl)' }}>
          <p className="text-center text-sm text-gray-600">
            {t('time.payoutSchedule')}
          </p>
        </div>
      )}
    </div>
  )
}
