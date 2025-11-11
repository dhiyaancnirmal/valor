"use client"

import { useState, useEffect } from "react"
import { Navigation, Coins } from "lucide-react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations()
  const [submittedStations, setSubmittedStations] = useState<Set<string>>(new Set())
  const [todaysRewards, setTodaysRewards] = useState<number>(20.00)

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

  const handleStationSubmitted = (stationId: string) => {
    setSubmittedStations(prev => new Set([...prev, stationId]))
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
            <p className="text-sm opacity-90 mb-1">{t("homeTab.todaysRewards")}</p>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              <span className="text-3xl font-bold">
                ${todaysRewards.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90 mb-1">{t("homeTab.stationsNearby")}</p>
            <p className="text-3xl font-bold">{sortedStations.length}</p>
          </div>
        </div>
      </div>

      {/* Gas Station Cards */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {sortedStations.length === 0 ? (
          <Card className="text-center py-12 shadow-sm">
            <CardContent>
              <div className="text-gray-400 text-6xl mb-4">⛽</div>
              <p className="text-base text-gray-600 font-semibold mb-2">{t("homeTab.noStationsFound")}</p>
              <p className="text-sm text-gray-500">
                {t("homeTab.adjustSearch")}
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
                          <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium">
                            <Navigation className="w-3.5 h-3.5" />
                            <span>{formatDistance(station.distance)}</span>
                          </Badge>
                        )}

                        {/* Earnings Badge - only show if not submitted */}
                        {!isSubmitted && (
                          <Badge
                            className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold shadow-sm"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{t("homeTab.earn")} $0.50</span>
                          </Badge>
                        )}
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
