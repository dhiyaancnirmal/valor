"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { Map, Home, Wallet, MapPin } from "lucide-react"
import { GoogleMapView } from "@/components/GoogleMap"
import { HomeTab } from "./HomeTab"
import { WalletTab } from "./WalletTab"
import { PriceSubmissionDrawer } from "@/components/PriceSubmissionDrawer"
import { SettingsDrawer } from "@/components/SettingsDrawer"
import PriceEntryPage from "@/components/PriceSubmissionDrawer/PriceEntryPageDrawer"
import { UserLocation, GasStation } from "@/types"
import { calculateDistance } from "@/lib/utils"
import Logo from "@/components/Logo"
import { MiniKit } from "@worldcoin/minikit-js"

type Tab = "map" | "home" | "wallet"

export function MainUI() {
  const t = useTranslations()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [gasStations, setGasStations] = useState<GasStation[]>([])
  const [loading, setLoading] = useState(true)
  const [isMiniKitReady, setIsMiniKitReady] = useState(false)
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSubmitPageOpen, setIsSubmitPageOpen] = useState(false)
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')

  // Shared station data state (persists across tab switches)
  const [stationData, setStationData] = useState<Record<string, {
    submissionCount: number
    potentialEarning: number
    latestPrice?: number
    latestFuelType?: string
    priceUpdatedAt?: string
  }>>({})
  const [isLoadingStationData, setIsLoadingStationData] = useState(false)

  // Track searched areas to avoid duplicate API calls
  const searchedBounds = useRef<Set<string>>(new Set())
  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null)

  // Check MiniKit readiness
  useEffect(() => {
    let cancelled = false
    let tries = 0
    const MAX_TRIES = 50
    const pollMiniKit = () => {
      if (typeof window === "undefined") return
      try {
        const installed = MiniKit.isInstalled()
        if (installed) {
          if (!cancelled) setIsMiniKitReady(true)
          return
        }
      } catch (e) {
        // Swallow errors during early boot; keep polling
      }
      if (tries < MAX_TRIES) {
        tries += 1
        setTimeout(pollMiniKit, 150)
      } else {
        // Fallback: some World App builds may delay bridge init; if UA indicates World App, allow non-MiniKit features to proceed
        try {
          const ua = navigator.userAgent || ""
          const looksLikeWorldApp = /WorldApp|WorldAppMiniKit|WorldCoin/i.test(ua)
          if (looksLikeWorldApp && !cancelled) {
            console.warn("MiniKit bridge not ready, but World App UA detected. Proceeding with limited features.")
            setIsMiniKitReady(true)
            return
          }
        } catch {}
        console.error("MiniKit is not installed. Make sure you're running the application inside of World App")
      }
    }
    pollMiniKit()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // Only start loading location after MiniKit is ready
    if (!isMiniKitReady) return

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
          console.error('Error getting location', error)
          setLoading(false)
        }
      )
    } else {
      console.error('Geolocation not supported')
      setLoading(false)
    }
  }, [isMiniKitReady])

  const fetchNearbyGasStations = async (location: UserLocation) => {
    try {
      if (!window.google) {
        console.error('Google Maps not loaded')
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
            placeId: place.place_id || "",
            types: place.types || [],
          }))

          // Sort by distance
          stations.sort((a, b) => (a.distance || 0) - (b.distance || 0))
          setGasStations(stations)
        }
        setLoading(false)
      })
    } catch (error) {
      console.error('Error fetching gas stations', error)
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
              placeId: place.place_id || "",
              types: place.types || [],
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

  const handleOpenSubmitPage = (station: GasStation) => {
    // Open overlay immediately without closing drawer
    setIsSubmitPageOpen(true)
    // Keep selectedStation set so drawer stays in background
  }

  const handleCloseSubmitPage = () => {
    setIsSubmitPageOpen(false)
    // Close drawer and clear station immediately
    setIsDrawerOpen(false)
    setSelectedStation(null)
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
    { id: "map" as Tab, icon: Map, label: t('mainUI.tabs.map') },
    { id: "home" as Tab, icon: Home, label: t('mainUI.tabs.home') },
    { id: "wallet" as Tab, icon: Wallet, label: t('mainUI.tabs.wallet') },
  ]

  if (loading || !isMiniKitReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F4F8]">
        <div className="w-12 h-12 border-4 border-[#7DD756] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#F4F4F8]">
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
            stationData={stationData}
            setStationData={setStationData}
            isLoadingStationData={isLoadingStationData}
            setIsLoadingStationData={setIsLoadingStationData}
          />
        )}
        {activeTab === "wallet" && <WalletTab onOpenSettings={() => setIsSettingsOpen(true)} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="relative bg-white border-t border-gray-100 z-50" style={{ paddingTop: 'var(--spacing-md)', paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + var(--spacing-md))`, boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.04)' }}>
        <div className="flex justify-around items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center justify-center transition-all"
                style={{ gap: 'var(--spacing-xs)', minWidth: '64px', padding: 'var(--spacing-xs)' }}
              >
                <div className={`flex items-center justify-center transition-all ${
                  isActive ? "bg-[#7DD756]/10" : ""
                }`} style={{ borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-xs)' }}>
                  <Icon
                    size={24}
                    className={isActive ? "text-[#7DD756]" : "text-gray-500"}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? "text-[#7DD756]" : "text-gray-500"
                }`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Price Submission Drawer - Hide when submit page is open */}
      {!isSubmitPageOpen && (
        <PriceSubmissionDrawer
          isOpen={isDrawerOpen}
          station={selectedStation}
          userLocation={userLocation}
          onClose={handleDrawerClose}
          onSuccess={handleSubmissionSuccess}
          onOpenSubmitPage={handleOpenSubmitPage}
        />
      )}

      {/* Submit Price Page Overlay - Full screen overlay */}
      {isSubmitPageOpen && selectedStation && (
        <div className="fixed inset-0 z-[100] bg-[#F4F4F8]">
          <PriceEntryPage
            station={selectedStation}
            userLocation={userLocation}
            onSuccess={() => {
              handleSubmissionSuccess()
              handleCloseSubmitPage()
            }}
            onClose={handleCloseSubmitPage}
          />
        </div>
      )}

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        units={units}
        setUnits={setUnits}
      />
    </div>
  )
}
