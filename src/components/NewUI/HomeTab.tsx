"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Search, Navigation, Coins, TrendingUp } from "lucide-react"
import { GasStation, UserLocation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface HomeTabProps {
  gasStations: GasStation[]
  userLocation: UserLocation | null
  onStationSelect: (station: GasStation) => void
}

export function HomeTab({ gasStations, userLocation, onStationSelect }: HomeTabProps) {
  const { t } = useTranslation(['home', 'common'])
  const [searchQuery, setSearchQuery] = useState("")

  // Remove duplicates by id
  const uniqueStations = gasStations.filter((station, index, self) =>
    index === self.findIndex(s => s.id === station.id)
  )

  // Sort stations: unsubmitted first (by distance), then submitted at the end
  const sortedStations = [...uniqueStations].sort((a, b) => {
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
    const baseReward = parseFloat(t('home:rewards.baseReward').replace('$', ''))
    const proximityBonus = distance < 200 ? parseFloat(t('home:rewards.proximityBonus').replace('+$', '')) : distance < 500 ? parseFloat(t('home:rewards.distanceBonus').replace('+$', '')) : 0
    return baseReward + proximityBonus
  }

  // Fetch today's rewards on mount and every 30 seconds
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
    const interval = setInterval(fetchRewards, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Reset submitted stations daily at midnight
  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime()
    
    const timer = setTimeout(() => {
      setSubmittedStations(new Set())
      // Set up next day's reset
      setInterval(() => {
        setSubmittedStations(new Set())
      }, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full flex flex-col bg-[#F4F4F8]">
      {/* Earnings Banner */}
      <div className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] px-6 py-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-90">{t('home:earnings.potentialToday')}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-4 h-4" />
              <span className="text-xl font-bold">
                ${(filteredStations.length * 2.5).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">{t('home:earnings.stationsNearby')}</p>
            <p className="text-xl font-bold mt-1">{t('home:earnings.stationsCount', { count: filteredStations.length })}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-5 py-3 border-b border-gray-200">
        <div className="relative w-full bg-gray-50 rounded-lg px-4 py-2.5">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('home:search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-gray-900 placeholder-gray-400 outline-none text-sm w-full pl-6"
          />
        </div>
      </div>

      {/* Gas Station Cards */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {sortedStations.length === 0 ? (
          <Card className="text-center py-12 shadow-sm">
            <CardContent>
              <div className="text-gray-400 text-5xl mb-3">⛽</div>
              <p className="text-sm text-gray-600 font-medium">{t('home:search.noStationsFound')}</p>
              <p className="text-xs text-gray-500 mt-1">
                {t('home:search.tryAdjustingSearch')}
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedStations.map((station) => {
            const isSubmitted = submittedStations.has(station.id)

            return (
              <Card
                key={station.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#7DD756] active:scale-[0.98] border border-gray-200"
                onClick={() => onStationSelect(station)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Station Image */}
                    <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-sm">
                      {station.photo ? (
                        <img
                          src={station.photo}
                          alt={station.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          ⛽
                        </div>
                      )}
                    </div>

                    {/* Station Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base mb-1.5 line-clamp-1">
                        {station.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2.5 line-clamp-1">
                        {station.address}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {station.distance !== undefined && (
                          <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                            <Navigation className="w-3 h-3" />
                            <span>{formatDistance(station.distance, t)}</span>
                          </Badge>
                        )}

                        {/* Earnings Badge */}
                        <Badge
                          className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
                        >
                          <Coins className="w-3 h-3" />
                          <span>{t('home:earnings.earnAmount', { amount: earnings.toFixed(2) })}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
