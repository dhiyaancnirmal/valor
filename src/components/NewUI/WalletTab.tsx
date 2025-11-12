"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSession, signOut } from "next-auth/react"
import { LogOut, Loader2, Settings, Copy, CheckCircle2 } from "lucide-react"
import { SettingsDrawer } from "@/components/SettingsDrawer"

interface AccruedRewards {
  totalAccrued: string
  totalUSDC: number
  submissionCount: number
}

export function WalletTab() {
  const { t } = useTranslation(['wallet', 'common'])
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [accruedRewards, setAccruedRewards] = useState<AccruedRewards | null>(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(true)

  // Check location permission
  const checkLocationPermission = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setLocationEnabled(false)
      return false
    }

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 1000,
            maximumAge: 300000
          }
        )
      })
      setLocationEnabled(true)
      return true
    } catch (error) {
      console.error('Sign out error:', error)
      alert(t('errors:general.failedToSignOut'))
      setIsSigningOut(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    try {
      console.log('Profile: Starting logout process...')
      await signOut({ redirect: false })
      console.log('Profile: Signout completed, forcing redirect...')
      // Force hard redirect to clear session state
      window.location.href = '/'
    } catch (error) {
      console.error('Profile: Logout error:', error)
      alert(t('walletTab.signOutFailed'))
      setIsLoggingOut(false)
    }
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
    <div className="h-full overflow-y-auto bg-[#F4F4F8] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">{t('common:tabs.wallet')}</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-4 pt-6 pb-4">
        <div className="bg-gradient-to-br from-[#7DD756] to-[#6BC647] rounded-2xl p-6 shadow-md">
          <p className="text-white/80 text-xs font-medium mb-2">
            {t('wallet:balance.accruedRewards', { defaultValue: 'Accrued Rewards' })}
          </p>
          <div className="flex items-baseline gap-2">
            {isLoadingRewards ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <>
                <span className="text-5xl font-bold text-white tabular-nums">
                  {accruedRewards?.totalUSDC.toFixed(2) || '0.00'}
                </span>
                <span className="text-xl font-semibold text-white/90">USDC</span>
              </>
            )}
          </div>
          {accruedRewards && accruedRewards.submissionCount > 0 && (
            <p className="text-white/70 text-xs mt-2">
              From {accruedRewards.submissionCount} submission{accruedRewards.submissionCount !== 1 ? 's' : ''}
            </p>
          )}
          {accruedRewards && accruedRewards.totalUSDC > 0 && (
            <p className="text-white/60 text-xs mt-1">
              Payout at 12:00 AM UTC
            </p>
          )}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {t('common:labels.walletAddress')}
            </p>
            <button
              onClick={copyAddress}
              className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              aria-label="Copy address"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <p className="font-mono text-sm font-medium text-gray-900 break-all">
            {session?.user?.walletAddress
              ? `${session.user.walletAddress.slice(0, 10)}...${session.user.walletAddress.slice(-8)}`
              : t('wallet:balance.notConnected')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 space-y-3 safe-area-b-20">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 text-gray-600 hover:bg-white rounded-lg transition-all duration-200 hover:scale-105"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('wallet:actions.signingOut')}</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>{t('wallet:actions.signOut')}</span>
            </>
          )}
        </button>
      </div>

      {/* Profile Content */}
      <div className="px-6 pb-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Profile Picture */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-3 border-gray-300">
              {session?.user?.profilePictureUrl ? (
                <img
                  src={session.user.profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" className="text-gray-500">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {session?.user?.username || t('walletTab.anonymousUser')}
              </h2>
              {session?.user?.walletAddress ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500 font-mono">
                    {session.user.walletAddress.slice(0, 8)}...{session.user.walletAddress.slice(-6)}
                  </span>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('walletTab.copyWalletAddress')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-mono">
                  {t('walletTab.notConnected')}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <StatsGrid
            columns={3}
            stats={[
              { label: t('walletTab.submissions'), value: '0' },
              { label: t('walletTab.usdcEarned'), value: '0' },
              { label: t('walletTab.rank'), value: '1', color: 'text-gray-900' }
            ]}
          />
        </div>
      </div>

      {/* Info Modal */}
      {isInfoOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
            onClick={() => setIsInfoOpen(false)}
          />

          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-all duration-300 ease-out z-[60]"
            style={{
              maxHeight: '70vh',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
              transform: 'translateY(0)'
            }}
          >
            <div className="w-full h-full flex flex-col relative">
              {/* Close button */}
              <button
                onClick={() => setIsInfoOpen(false)}
                className="absolute top-4 left-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 pt-16 pb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-8">{t('settingsDrawer.about')}</h3>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">📍 {t('settingsDrawer.findStations')}</h4>
                    <p className="text-base text-gray-600 leading-relaxed">
                      {t('settingsDrawer.findStationsDesc')}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">💸 {t('settingsDrawer.submitPrices')}</h4>
                    <p className="text-base text-gray-600 leading-relaxed">
                      {t('settingsDrawer.submitPricesDesc')}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">🎁 {t('settingsDrawer.earnRewards')}</h4>
                    <p className="text-base text-gray-600 leading-relaxed">
                      {t('settingsDrawer.earnRewardsDesc')}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    {t('settingsDrawer.version')} 1.0.0
                  </p>
                </div>
              </div>

              {/* Close button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="w-full bg-black text-white rounded-xl py-4 text-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  {t('settingsDrawer.gotIt')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        session={session}
        username={session?.user?.username || null}
        notificationsEnabled={notificationsEnabled}
        locationEnabled={locationEnabled}
        loadingPermissions={loadingPermissions}
        onToggleNotifications={toggleNotifications}
        onToggleLocation={toggleLocationServices}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        language={locale}
        setLanguage={(lang) => setLocale(lang as 'en' | 'es-AR')}
      />

      {/* Floating Info Button */}
      <button
        onClick={() => setIsInfoOpen(true)}
        className="fixed bottom-24 right-6 w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow z-40"
      >
        <Info size={20} className="text-white" />
      </button>
    </div>
  )
}
