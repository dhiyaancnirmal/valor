"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Map, Home, Wallet, MapPin } from "lucide-react"
import { GoogleMapView } from "@/components/GoogleMap"
import { HomeTab } from "./HomeTab"
import { WalletTab } from "./WalletTab"
import { PriceSubmissionDrawer } from "@/components/PriceSubmissionDrawer"
import { UserLocation, GasStation } from "@/types"
import { calculateDistance } from "@/lib/utils"

type Tab = "map" | "home" | "wallet"

export function MainUI() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [gasStations, setGasStations] = useState<GasStation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          setUserLocation(location)
          fetchNearbyGasStations(location)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLoading(false)
        }
      )
    } else {
      console.error("Geolocation not supported")
      setLoading(false)
    }
  }, [])

  const fetchNearbyGasStations = async (location: UserLocation) => {
    try {
      if (!window.google) {
        console.error("Google Maps not loaded")
        setLoading(false)
        return
      }

      const service = new google.maps.places.PlacesService(
        document.createElement("div")
      )

      const request = {
        location: new google.maps.LatLng(location.latitude, location.longitude),
        radius: 5000, // 5km radius
        type: "gas_station",
      }

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const stations: GasStation[] = results.map((place) => ({
            id: place.place_id || "",
            name: place.name || "",
            address: place.vicinity || "",
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
            distance: place.geometry?.location
              ? calculateDistance(
                  location.latitude,
                  location.longitude,
                  place.geometry.location.lat(),
                  place.geometry.location.lng()
                )
              : undefined,
            photo: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
          }))

          // Sort by distance
          stations.sort((a, b) => (a.distance || 0) - (b.distance || 0))
          setGasStations(stations)
        }
        setLoading(false)
      })
    } catch (error) {
      console.error("Error fetching gas stations:", error)
      setLoading(false)
    }
  }

  const handleStationSelect = (station: GasStation) => {
    setSelectedStation(station)
    setIsDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
    setTimeout(() => setSelectedStation(null), 300) // Wait for animation
  }

  const handleSubmissionSuccess = () => {
    // Refresh gas stations list
    if (userLocation) {
      fetchNearbyGasStations(userLocation)
    }
  }

  const tabs = [
    { id: "map" as Tab, icon: Map, label: "Map" },
    { id: "home" as Tab, icon: Home, label: "Home" },
    { id: "wallet" as Tab, icon: Wallet, label: "Wallet" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nearby gas stations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-2xl">⛽</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Valor</h1>
          </div>
          {userLocation && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Location enabled</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "map" && (
          <GoogleMapView
            userLocation={userLocation}
            gasStations={gasStations}
            onStationSelect={handleStationSelect}
          />
        )}
        {activeTab === "home" && (
          <HomeTab
            gasStations={gasStations}
            userLocation={userLocation}
            onStationSelect={handleStationSelect}
          />
        )}
        {activeTab === "wallet" && <WalletTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 px-4 py-2 safe-area-inset-bottom">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 px-6 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Price Submission Drawer */}
      <PriceSubmissionDrawer
        isOpen={isDrawerOpen}
        station={selectedStation}
        userLocation={userLocation}
        onClose={handleDrawerClose}
        onSuccess={handleSubmissionSuccess}
      />
    </div>
  )
}
