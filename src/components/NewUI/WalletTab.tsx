"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { LogOut, Loader2, Settings, Copy, CheckCircle2 } from "lucide-react"
import { SettingsDrawer } from "@/components/SettingsDrawer"

export function WalletTab() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return

    try {
      setIsSigningOut(true)
      await signOut({ redirect: false })
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      alert("Failed to sign out")
      setIsSigningOut(false)
    }
  }

  const copyAddress = () => {
    if (session?.user?.walletAddress) {
      navigator.clipboard.writeText(session.user.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F4F4F8]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Wallet</h1>
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
          <p className="text-white/80 text-xs font-medium mb-2">Total Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-white tabular-nums">0</span>
            <span className="text-xl font-semibold text-white/90">WLD</span>
          </div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Wallet Address
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
              : "Not connected"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 space-y-3 safe-area-b-20">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
        >
          {isSigningOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </>
          )}
        </button>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
