"use client"

import { useState } from "react"
import { Search, Navigation, Coins, TrendingUp } from "lucide-react"
import { GasStation, UserLocation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface HomeTabProps {
  gasStations: GasStation[]
  userLocation: UserLocation | null
  onStationSelect: (station: GasStation) => void
}

export function HomeTab({ gasStations, userLocation, onStationSelect }: HomeTabProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Remove duplicates by id and then filter by search query
  const uniqueStations = gasStations.filter((station, index, self) =>
    index === self.findIndex(s => s.id === station.id)
  )

  const filteredStations = uniqueStations.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="h-full flex flex-col bg-[#F4F4F8]">
      {/* Earnings Banner */}
      <div className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-90">Potential earnings today</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-4 h-4" />
              <span className="text-xl font-bold">
                ${(filteredStations.length * 2.5).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-90">Stations nearby</p>
            <p className="text-xl font-bold mt-1">{filteredStations.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-5 py-3 border-b border-gray-200">
        <div className="relative w-full bg-gray-50 rounded-lg px-4 py-2.5">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search gas stations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-gray-900 placeholder-gray-400 outline-none text-sm w-full pl-6"
          />
        </div>
      </div>

      {/* Gas Station Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredStations.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <div className="text-gray-400 text-5xl mb-3">⛽</div>
              <p className="text-sm text-gray-600 font-medium">No stations found</p>
              <p className="text-xs text-gray-500 mt-1">
                Try adjusting your search or location
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStations.map((station) => {
            const earnings = calculateEarnings(station.distance)

            return (
              <Card
                key={station.id}
                className="hover:shadow-md transition-all duration-200 cursor-pointer hover:border-[#7DD756] active:scale-[0.99]"
                onClick={() => onStationSelect(station)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {/* Station Image */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
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
                      <h3 className="font-semibold text-gray-900 truncate text-sm mb-1">
                        {station.name}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mb-2">
                        {station.address}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        {station.distance !== undefined && (
                          <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                            <Navigation className="w-3 h-3" />
                            <span>{formatDistance(station.distance)}</span>
                          </Badge>
                        )}

                        {/* Earnings Badge */}
                        <Badge
                          className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Earn ${earnings.toFixed(2)}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStationSelect(station)
                        }}
                        size="sm"
                        variant="icon"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </Button>
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
