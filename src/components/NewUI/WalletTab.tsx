"use client"

import { useState, useCallback, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Copy, Settings, Info } from "lucide-react"
import { useTranslations } from "next-intl"
import { MiniKit } from "@worldcoin/minikit-js"
import { GradientCard, StatsGrid } from "@/components/shared"
import SettingsModal from "@/components/SettingsModal"
import { useLanguage } from "@/components/providers/LanguageProvider"

export function WalletTab() {
  const { data: session } = useSession()
  const t = useTranslations()
  const { locale, setLocale } = useLanguage()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [loadingPermissions, setLoadingPermissions] = useState(false)

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
      setLocationEnabled(false)
      return false
    }
  }, [])

  // Check all permissions
  const checkPermissions = useCallback(async () => {
    setLoadingPermissions(true)

    // Try to get MiniKit permissions, fall back gracefully if not in World App
    try {
      // Add a small delay to ensure MiniKit is fully initialized
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (MiniKit.isInstalled()) {
        const payload = await MiniKit.commandsAsync.getPermissions()

        if (payload.finalPayload.status === 'success') {
          const permissions = payload.finalPayload.permissions
          if (Array.isArray(permissions)) {
            setNotificationsEnabled(permissions.includes('notifications'))
          } else {
            setNotificationsEnabled(false)
          }
        } else {
          setNotificationsEnabled(false)
        }
      } else {
        // MiniKit not installed (not in World App) - this is expected in browser
        setNotificationsEnabled(false)
      }
    } catch (error) {
      // MiniKit not available (not in World App) - this is expected in browser
      setNotificationsEnabled(false)
    }

    // Always check location permission (works in both browser and World App)
    await checkLocationPermission()
    setLoadingPermissions(false)
  }, [checkLocationPermission])

  // Check permissions when session is available
  useEffect(() => {
    if (session) {
      // Add delay to ensure MiniKit is fully initialized before checking permissions
      const timer = setTimeout(() => {
        checkPermissions()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [session, checkPermissions])

  // Toggle notifications
  const toggleNotifications = useCallback(async () => {
    try {
      if (!MiniKit.isInstalled()) {
        alert(t('settingsDrawer.notificationsWorldAppOnly'))
        return
      }

      const payload = await MiniKit.commandsAsync.requestPermission({
        permission: 'notifications' as any
      })

      if (payload.finalPayload.status === 'success') {
        setNotificationsEnabled(true)
        const checkPayload = await MiniKit.commandsAsync.getPermissions()
        if (checkPayload.finalPayload.status === 'success') {
          const permissions = checkPayload.finalPayload.permissions
          if (Array.isArray(permissions)) {
            setNotificationsEnabled(permissions.includes('notifications'))
          } else {
            setNotificationsEnabled(true)
          }
        }
      }
    } catch (error) {
      // MiniKit not available (not in World App)
      alert(t('settingsDrawer.notificationsWorldAppOnly'))
      console.warn('MiniKit notification permission error:', error)
    }
  }, [t])

  // Toggle location services
  const toggleLocationServices = useCallback(async () => {
    try {
      if (locationEnabled) return

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        )
      })

      console.log('Location access granted:', position.coords)
      setLocationEnabled(true)
    } catch (error) {
      console.error('Error requesting location permission:', error)
      setLocationEnabled(false)
    }
  }, [locationEnabled])

  // Handle copy wallet address
  const handleCopyAddress = async () => {
    if (session?.user?.walletAddress) {
      try {
        await navigator.clipboard.writeText(session.user.walletAddress)
        console.log('Wallet address copied to clipboard')
      } catch (error) {
        console.error('Failed to copy address:', error)
      }
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

  return (
    <div className="h-full overflow-y-auto bg-[#F4F4F8] pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('walletTab.account')}</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 text-gray-600 hover:bg-white rounded-lg transition-all duration-200 hover:scale-105"
        >
          <Settings size={24} />
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
