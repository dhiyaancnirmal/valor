"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Navigation, Coins } from "lucide-react"
import { GasStation, UserLocation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { SearchBar } from "./SearchBar"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [submittedStations, setSubmittedStations] = useState<Set<string>>(new Set())
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

  // Sort stations: unsubmitted first (by distance), then submitted at the end
  const sortedStations = [...filteredStations].sort((a, b) => {
    const aSubmitted = submittedStations.has(a.id)
    const bSubmitted = submittedStations.has(b.id)
    
    // If one is submitted and the other isn't, prioritize unsubmitted
    if (aSubmitted && !bSubmitted) return 1
    if (!aSubmitted && bSubmitted) return -1
    
    // Both same status, sort by distance
    return (a.distance || 0) - (b.distance || 0)
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

  // Reset submitted stations daily at midnight UTC
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    
    const scheduleReset = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime()
      
      timer = setTimeout(() => {
        setSubmittedStations(new Set())
        // Schedule next reset
        scheduleReset()
      }, msUntilMidnight)
    }
    
    scheduleReset()
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-[#F4F4F8] overflow-hidden">
      {/* Earnings Banner */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#7DD756] to-[#6BC647] px-6 py-5 text-white shadow-sm">
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

      {/* Search Bar */}
      <div className="flex-shrink-0 bg-white px-5 py-3 border-b border-gray-200">
        <SearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
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
              const isSubmitted = submittedStations.has(station.id)
              const data = stationData[station.id]
              const isStationLoading = isLoadingStationData && !data
              const earnings = data?.potentialEarning || 0.50
              const submissionCount = data?.submissionCount || 0
              const latestPrice = data?.latestPrice
              const latestFuelType = data?.latestFuelType

              return (
                <div key={station.id}>
                  <div
                    className="bg-white cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
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
                        <h3 className="font-semibold text-[#1C1C1E] text-base line-clamp-1" style={{ marginBottom: 'var(--spacing-xs)' }}>
                          {station.name}
                        </h3>
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
                          <span className="inline-flex items-center bg-[#7DD756] text-white px-2 py-1 text-xs font-semibold" style={{ borderRadius: 'var(--spacing-xs)', gap: 'var(--spacing-xs)' }}>
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
