"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Map, Home, Wallet, MapPin } from "lucide-react"
import { GoogleMapView } from "@/components/GoogleMap"
import { HomeTab } from "./HomeTab"
import { WalletTab } from "./WalletTab"
import { PriceSubmissionDrawer } from "@/components/PriceSubmissionDrawer"
import { UserLocation, GasStation } from "@/types"
import { calculateDistance } from "@/lib/utils"
import Logo from "@/components/Logo"

type Tab = "map" | "home" | "wallet"

export function MainUI() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [gasStations, setGasStations] = useState<GasStation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoadingStations, setIsLoadingStations] = useState(false)

  // Track searched areas to avoid duplicate API calls
  const searchedBounds = useRef<Set<string>>(new Set())

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

  // Handle map bounds changes for dynamic loading
  const handleBoundsChanged = async (center: UserLocation, bounds: google.maps.LatLngBounds) => {
    if (!userLocation) return

    // Check if we already have enough stations in this area
    const existingStationsInBounds = gasStations.filter(station => {
      const stationLatLng = new google.maps.LatLng(station.latitude, station.longitude)
      return bounds.contains(stationLatLng)
    })

    // Only fetch if we have fewer than 5 stations in this visible area
    if (existingStationsInBounds.length < 5) {
      await fetchGasStationsInBounds(bounds)
    }
  }

  // Fetch gas stations within map bounds
  const fetchGasStationsInBounds = async (bounds: google.maps.LatLngBounds) => {
    try {
      if (!window.google || !userLocation) return

      setIsLoadingStations(true)

      const service = new google.maps.places.PlacesService(
        document.createElement("div")
      )

      // Create bounds key to prevent duplicate searches
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const boundsKey = `${ne.lat().toFixed(3)}_${ne.lng().toFixed(3)}_${sw.lat().toFixed(3)}_${sw.lng().toFixed(3)}`

      // Skip if we've already searched this area
      if (searchedBounds.current.has(boundsKey)) {
        console.log("Already searched this area, skipping...")
        setIsLoadingStations(false)
        return
      }

      searchedBounds.current.add(boundsKey)
      console.log("Searching new area:", boundsKey)

      // Use bounds-based search for better coverage
      const request = {
        bounds: bounds,
        type: "gas_station",
      }

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const newStations: GasStation[] = results
            .filter((place) => {
              // Filter out duplicates by checking existing stations
              return !gasStations.some(existing => existing.id === place.place_id)
            })
            .map((place) => ({
              id: place.place_id || "",
              name: place.name || "",
              address: place.vicinity || "",
              latitude: place.geometry?.location?.lat() || 0,
              longitude: place.geometry?.location?.lng() || 0,
              distance: place.geometry?.location
                ? calculateDistance(
                    userLocation!.latitude,
                    userLocation!.longitude,
                    place.geometry.location.lat(),
                    place.geometry.location.lng()
                  )
                : undefined,
              photo: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
            }))

          if (newStations.length > 0) {
            console.log(`Found ${newStations.length} new gas stations`)
            setGasStations(prev => [...prev, ...newStations])
          }
        }
        setIsLoadingStations(false)
      })
    } catch (error) {
      console.error("Error fetching gas stations in bounds:", error)
      setIsLoadingStations(false)
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
      <div className="flex items-center justify-center min-h-screen bg-[#F4F4F8]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gas stations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#F4F4F8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Logo size={40} />
          </div>
          {userLocation && (
            <div className="flex items-center text-xs text-gray-600 font-medium">
              <MapPin className="w-4 h-4 mr-1.5" />
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
            onBoundsChanged={handleBoundsChanged}
            isLoadingStations={isLoadingStations}
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
      <nav className="bg-white border-t border-gray-200 px-4 py-2 safe-area-b-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-[#1C1C1E]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-5 h-5" />
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
