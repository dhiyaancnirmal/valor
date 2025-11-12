"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation(['common'])
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
  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null)

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
          console.error(t('errors:location.errorGettingLocation'), error)
          setLoading(false)
        }
      )
    } else {
      console.error(t('errors:location.geolocationNotSupported'))
      setLoading(false)
    }
  }, [])

  const fetchNearbyGasStations = async (location: UserLocation) => {
    try {
      if (!window.google) {
        console.error(t('errors:map.googleMapsNotLoaded'))
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
      console.error(t('errors:map.errorFetchingGasStations'), error)
      setLoading(false)
    }
  }

  // Handle map bounds changes for dynamic loading (debounced)
  const handleBoundsChanged = async (center: UserLocation, bounds: google.maps.LatLngBounds) => {
    if (!userLocation) return

    // Clear any pending timeout
    if (boundsChangeTimeout.current) {
      clearTimeout(boundsChangeTimeout.current)
    }

    // Debounce: wait 500ms after last bounds change before fetching
    boundsChangeTimeout.current = setTimeout(async () => {
      // Check if we already have enough stations in this area
      const existingStationsInBounds = gasStations.filter(station => {
        const stationLatLng = new google.maps.LatLng(station.latitude, station.longitude)
        return bounds.contains(stationLatLng)
      })

      // Only fetch if we have fewer than 5 stations in this visible area
      if (existingStationsInBounds.length < 5) {
        await fetchGasStationsInBounds(bounds)
      }
    }, 500) // 500ms debounce
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
    // Don't refresh gas stations - prices are fetched on-demand when drawer opens
    // This prevents excessive API calls
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (boundsChangeTimeout.current) {
        clearTimeout(boundsChangeTimeout.current)
      }
    }
  }, [])

  const tabs = [
    { id: "map" as Tab, icon: Map, label: t('common:tabs.map') },
    { id: "home" as Tab, icon: Home, label: t('common:tabs.home') },
    { id: "wallet" as Tab, icon: Wallet, label: t('common:tabs.wallet') },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F4F8]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common:labels.loadingGasStations')}</p>
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
              <span>{t('common:labels.locationEnabled')}</span>
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
      <nav className="bg-white border-t border-gray-200 z-50 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div className="flex justify-around items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-[#7DD756]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={24} />
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
