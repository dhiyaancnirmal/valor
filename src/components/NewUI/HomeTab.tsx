"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Navigation, Coins, ChevronDown, Check } from "lucide-react"
import { GasStation, UserLocation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { SearchBar } from "./SearchBar"
import { useSession } from "next-auth/react"

interface HomeTabProps {
  gasStations: GasStation[]
  userLocation: UserLocation | null
  onStationSelect: (station: GasStation) => void
  stationData: Record<string, {
    submissionCount: number
    potentialEarning: number
    latestPrice?: number
    latestFuelType?: string
    priceUpdatedAt?: string
  }>
  setStationData: React.Dispatch<React.SetStateAction<Record<string, {
    submissionCount: number
    potentialEarning: number
    latestPrice?: number
    latestFuelType?: string
    priceUpdatedAt?: string
  }>>>
  isLoadingStationData: boolean
  setIsLoadingStationData: React.Dispatch<React.SetStateAction<boolean>>
}

type SortOption = 'proximity' | 'priority' | 'price-low' | 'price-high'

export function HomeTab({
  gasStations,
  userLocation,
  onStationSelect,
  stationData,
  setStationData,
  isLoadingStationData,
  setIsLoadingStationData
}: HomeTabProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>('proximity')
  const [userStationSubmissions, setUserStationSubmissions] = useState<Record<string, string[]>>({})
  const [todaysRewards, setTodaysRewards] = useState(0)

  // Remove duplicates by id
  const uniqueStations = gasStations.filter((station, index, self) =>
    index === self.findIndex(s => s.id === station.id)
  )

  // Filter stations by search query
  const filteredStations = uniqueStations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Determine if station is complete (all 3 fuel types submitted by user)
  const isStationComplete = (stationId: string) => {
    const submittedTypes = userStationSubmissions[stationId] || []
    return submittedTypes.length >= 3
  }

  // Get user submission count for a station
  const getUserSubmissionCount = (stationId: string) => {
    return (userStationSubmissions[stationId] || []).length
  }

  // Sort stations based on selected option
  const sortedStations = [...filteredStations].sort((a, b) => {
    const aComplete = isStationComplete(a.id)
    const bComplete = isStationComplete(b.id)
    const aSubmissionCount = getUserSubmissionCount(a.id)
    const bSubmissionCount = getUserSubmissionCount(b.id)
    const aPrice = stationData[a.id]?.latestPrice || 0
    const bPrice = stationData[b.id]?.latestPrice || 0
    const aDistance = a.distance || Infinity
    const bDistance = b.distance || Infinity

    switch (sortOption) {
      case 'proximity':
        // Sort by distance, but complete stations at end
        if (aComplete && !bComplete) return 1
        if (!aComplete && bComplete) return -1
        return aDistance - bDistance

      case 'priority':
        // Unsubmitted stations first (by distance), then submitted (by distance)
        if (aSubmissionCount === 0 && bSubmissionCount > 0) return -1
        if (aSubmissionCount > 0 && bSubmissionCount === 0) return 1
        // Both same priority level, sort by distance
        return aDistance - bDistance

      case 'price-low':
        // Lowest price first, then by distance
        if (aPrice === 0 && bPrice > 0) return 1
        if (aPrice > 0 && bPrice === 0) return -1
        if (aPrice !== bPrice) return aPrice - bPrice
        return aDistance - bDistance

      case 'price-high':
        // Highest price first, then by distance
        if (aPrice === 0 && bPrice > 0) return 1
        if (aPrice > 0 && bPrice === 0) return -1
        if (aPrice !== bPrice) return bPrice - aPrice
        return aDistance - bDistance

      default:
        return aDistance - bDistance
    }
  })

  // Calculate potential earnings
  const calculateEarnings = (distance: number | undefined) => {
    if (!distance) return 2.50
    // Base reward: $2.50
    // Bonus for closer stations (within 200m): +$1.00
    // Bonus for stations within 500m: +$0.50
    const baseReward = 2.50
    const proximityBonus = distance < 200 ? 1.00 : distance < 500 ? 0.50 : 0
    return baseReward + proximityBonus
  }

  // Fetch user's station submissions
  useEffect(() => {
    if (session?.user?.walletAddress) {
      fetch('/api/user-station-submissions')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.stationSubmissions) {
            setUserStationSubmissions(data.stationSubmissions)
          }
        })
        .catch(error => {
          console.error('Error fetching user submissions:', error)
        })
    }
  }, [session?.user?.walletAddress])

  // Fetch today's rewards on mount only (no polling)
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const response = await fetch('/api/todays-rewards')
        if (response.ok) {
          const data = await response.json()
          setTodaysRewards(data.remaining)
        }
      } catch (error) {
        console.error('Error fetching today\'s rewards:', error)
      }
    }

    fetchRewards()
    // Removed polling - fetch only on mount
  }, [])

  // Fetch station data when stations load (with caching)
  useEffect(() => {
    const fetchStationData = async () => {
      if (uniqueStations.length === 0) return

      // Check which stations we don't have data for yet
      const stationIdsToFetch = uniqueStations
        .filter(s => !stationData[s.id])
        .map(s => s.id)

      // If we already have data for all stations, skip fetching
      if (stationIdsToFetch.length === 0) return

      setIsLoadingStationData(true)
      try {
        const response = await fetch('/api/station-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stationIds: stationIdsToFetch }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Merge new data with existing data (caching)
            setStationData(prev => ({ ...prev, ...data.stationData }))
          }
        }
      } catch (error) {
        console.error('Error fetching station data:', error)
      } finally {
        setIsLoadingStationData(false)
      }
    }

    fetchStationData()
  }, [uniqueStations.length])

  // Refresh user submissions after successful submission (polling every 30s)
  useEffect(() => {
    if (!session?.user?.walletAddress) return

    const refreshSubmissions = () => {
      fetch('/api/user-station-submissions')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.stationSubmissions) {
            setUserStationSubmissions(data.stationSubmissions)
          }
        })
        .catch(error => {
          console.error('Error refreshing user submissions:', error)
        })
    }

    const interval = setInterval(refreshSubmissions, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [session?.user?.walletAddress])

  return (
    <div className="h-full flex flex-col bg-[#F4F4F8] overflow-hidden">
      {/* Earnings Banner */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#7DD756] to-[#6BC647] px-8 py-5 text-white shadow-sm" style={{ paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 2rem)', paddingRight: 'calc(env(safe-area-inset-right, 0px) + 2rem)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-90">{t('homeTab.potentialToday')}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-4 h-4" />
              <span className="text-xl font-bold">
                ${(filteredStations.length * 2.5).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">{t('homeTab.stationsNearby')}</p>
            <p className="text-xl font-bold mt-1">{t('homeTab.stationsCount', { count: filteredStations.length })}</p>
          </div>
        </div>
      </div>

      {/* Search Bar and Sort Dropdown */}
      <div className="flex-shrink-0 bg-white py-3 border-b border-gray-200" style={{ paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1.5rem)', paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none bg-white border border-gray-300 text-gray-900 text-sm font-medium px-4 py-2 pr-8 rounded-lg focus:outline-none focus:border-[#7DD756] transition-colors cursor-pointer"
            >
              <option value="proximity">{t('homeTab.sort.proximity')}</option>
              <option value="priority">{t('homeTab.sort.priority')}</option>
              <option value="price-low">{t('homeTab.sort.priceLow')}</option>
              <option value="price-high">{t('homeTab.sort.priceHigh')}</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Gas Station Cards */}
      <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain', padding: 'var(--spacing-lg) var(--spacing-lg) var(--spacing-xl)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {sortedStations.length === 0 ? (
            <div className="bg-white p-6 text-center" style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="text-gray-400 text-5xl mb-3">⛽</div>
              <p className="text-sm text-gray-600 font-medium">{t('homeTab.noStationsFound')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t('homeTab.adjustSearch')}
              </p>
            </div>
          ) : (
            sortedStations.map((station) => {
              const isComplete = isStationComplete(station.id)
              const userSubmissionCount = getUserSubmissionCount(station.id)
              const data = stationData[station.id]
              const isStationLoading = isLoadingStationData && !data
              const earnings = data?.potentialEarning || 0.00
              const submissionCount = data?.submissionCount || 0
              const latestPrice = data?.latestPrice
              const latestFuelType = data?.latestFuelType

              return (
                <div key={station.id}>
                  <div
                    className={`cursor-pointer transition-all duration-200 ${
                      isComplete 
                        ? 'opacity-60 bg-gray-50' 
                        : 'bg-white hover:scale-[1.01] active:scale-[0.99]'
                    }`}
                    style={{ borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-lg)' }}
                    onClick={() => onStationSelect(station)}
                  >
                    <div className="flex items-start" style={{ gap: 'var(--spacing-md)' }}>
                      {/* Station Image */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 overflow-hidden" style={{ borderRadius: 'var(--radius-sm)' }}>
                        {station.photo ? (
                          <img
                            src={station.photo}
                            alt={station.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            ⛽
                          </div>
                        )}
                      </div>

                      {/* Station Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                          <h3 className="font-semibold text-[#1C1C1E] text-base line-clamp-1">
                            {station.name}
                          </h3>
                          {isComplete && (
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              <Check className="w-3 h-3" />
                              <span>Complete</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1" style={{ marginBottom: 'var(--spacing-sm)' }}>
                          {station.address}
                        </p>

                        <div className="flex items-center flex-wrap" style={{ gap: 'var(--spacing-xs)' }}>
                          {station.distance !== undefined && (
                            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 text-xs font-medium" style={{ borderRadius: 'var(--spacing-xs)', gap: 'var(--spacing-xs)' }}>
                              <Navigation className="w-3 h-3" />
                              {formatDistance(station.distance, t)}
                            </span>
                          )}

                          {/* Earnings Badge */}
                          <span className="inline-flex items-center bg-[#7DD756] text-white py-1 text-xs font-semibold" style={{ borderRadius: 'var(--spacing-xs)', gap: 'var(--spacing-xs)', paddingLeft: 'var(--spacing-sm)', paddingRight: 'var(--spacing-sm)' }}>
                            <Coins className="w-3 h-3" />
                            ${earnings.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Latest Price Section */}
                      <div className="flex-shrink-0 text-right">
                        {isStationLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#7DD756] rounded-full animate-spin"></div>
                          </div>
                        ) : latestPrice ? (
                          <>
                            <div className="text-xl font-bold text-[#1C1C1E]">
                              ${latestPrice.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500" style={{ marginTop: '2px' }}>
                              {latestFuelType || 'Regular'}
                            </div>
                            {submissionCount > 0 && (
                              <div className="text-xs text-gray-400" style={{ marginTop: 'var(--spacing-xs)' }}>
                                {submissionCount} {submissionCount === 1 ? t('plurals.update') : t('plurals.updates')}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-400">
                              {t('status.noPrice')}
                            </div>
                            {submissionCount > 0 && (
                              <div className="text-xs text-gray-400" style={{ marginTop: 'var(--spacing-xs)' }}>
                                {submissionCount} {submissionCount === 1 ? t('plurals.update') : t('plurals.updates')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
