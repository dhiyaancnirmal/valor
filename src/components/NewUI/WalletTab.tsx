"use client"

import { useSession, signOut } from "next-auth/react"
import { Wallet, LogOut, Award, TrendingUp } from "lucide-react"

export function WalletTab() {
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" })
  }

  const stats = [
    { label: "Submissions", value: "0", icon: TrendingUp },
    { label: "Rewards Earned", value: "0 WLD", icon: Award },
  ]

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-90">Wallet Address</p>
              <p className="font-mono text-sm font-medium">
                {session?.user?.walletAddress
                  ? `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}`
                  : "Not connected"}
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4">
            <p className="text-sm opacity-90 mb-2">Total Balance</p>
            <p className="text-3xl font-bold">0 WLD</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <Icon className="w-4 h-4" />
                  <p className="text-xs">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Submit gas prices at nearby stations</li>
            <li>• Earn rewards for accurate submissions</li>
            <li>• Help others find the best prices</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
