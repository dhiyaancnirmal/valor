"use client"

import { useState } from "react"
import { Search, Navigation, Coins, TrendingUp, Zap } from "lucide-react"
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

  const filteredStations = gasStations.filter((station) =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate potential earnings (mock logic for gamification)
  const calculateEarnings = (distance: number | undefined) => {
    if (!distance) return { amount: 2.50, multiplier: 1 }
    // Base reward: $2.50
    // Bonus for closer stations (within 200m): +$1.00
    // High demand bonus (random for demo): 0-50%
    const baseReward = 2.50
    const proximityBonus = distance < 200 ? 1.00 : distance < 500 ? 0.50 : 0
    const demandMultiplier = Math.random() > 0.7 ? 1.5 : 1 // 30% chance of high demand
    const total = (baseReward + proximityBonus) * demandMultiplier
    return { amount: total, multiplier: demandMultiplier }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-green-50 to-gray-50">
      {/* Earnings Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Your Potential Today</p>
            <div className="flex items-center gap-2 mt-1">
              <Coins className="w-6 h-6" />
              <span className="text-2xl font-bold">
                ${(filteredStations.length * 2.5).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Stations Nearby</p>
            <p className="text-2xl font-bold">{filteredStations.length}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search gas stations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Gas Station Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredStations.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <div className="text-gray-400 text-5xl mb-4">⛽</div>
              <p className="text-gray-600 font-medium">No gas stations found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search or location
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStations.map((station) => {
            const earnings = calculateEarnings(station.distance)
            const isHighDemand = earnings.multiplier > 1

            return (
              <Card
                key={station.id}
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-500 relative overflow-hidden"
                onClick={() => onStationSelect(station)}
              >
                {isHighDemand && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white px-3 py-1 text-xs font-bold flex items-center gap-1 rounded-bl-lg">
                    <Zap className="w-3 h-3" />
                    HIGH DEMAND
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Station Image */}
                    <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
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
                      <h3 className="font-bold text-gray-900 truncate text-lg">
                        {station.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {station.address}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        {station.distance !== undefined && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {formatDistance(station.distance)}
                          </Badge>
                        )}

                        {/* Earnings Badge */}
                        <Badge
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-1"
                        >
                          <Coins className="w-3 h-3" />
                          Earn ${earnings.amount.toFixed(2)}
                        </Badge>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStationSelect(station)
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Submit
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
