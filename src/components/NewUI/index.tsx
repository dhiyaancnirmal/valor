"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Map as MapIcon, Home, Wallet, Plus } from "lucide-react"
import { AppleMapView, MapBounds, reverseGeocodeCoordinate } from "@/components/AppleMap"
import { BottomSheet, MobileScreen, StickyActionBar } from "@/components/mobile"
import { HomeTab } from "./HomeTab"
import { WalletTab } from "./WalletTab"
import { PriceSubmissionDrawer } from "@/components/PriceSubmissionDrawer"
import { SettingsDrawer } from "@/components/SettingsDrawer"
import PriceEntryPage from "@/components/PriceSubmissionDrawer/PriceEntryPageDrawer"
import { UserLocation, MapVenue, StationMapItem } from "@/types"
import { calculateDistance, cn } from "@/lib/utils"
import { MiniKit } from "@worldcoin/minikit-js"
import { useCaptureMode } from "@/lib/capture-mode"
import { isWorldDevBypassEnabled, looksLikeWorldAppUserAgent } from "@/lib/world-dev"
import { useMobileViewport } from "@/components/providers/MobileViewportProvider"

type Tab = "map" | "home" | "wallet"
type AddStoreStep = "location" | "details"
type StoreFormField = "storeName" | "storeAddress"

const DEFAULT_RADIUS_METERS = 5000
const MIN_BOUNDS_RESULTS = 18
const MAX_BOUNDS_RESULTS = 42
const MAP_CATEGORIES = ["grocery_store", "gas_station"] as const
const QUERY_CACHE_TTL_MS = 120_000
const MAX_QUERY_CACHE_ENTRIES = 120
const BOUNDS_DEBOUNCE_MS = 350
const FETCHED_BOUNDS_TTL_MS = 10 * 60_000

type MiniKitHostWindow = Window & {
  MiniKit?: unknown
  WorldApp?: unknown
}

function ensureMiniKitReady(): boolean {
  if (typeof window === "undefined") return false

  const hostWindow = window as MiniKitHostWindow
  if (hostWindow.MiniKit) return true

  const result = MiniKit.install(process.env.NEXT_PUBLIC_APP_ID)
  if (result.success) return true
  if ("errorCode" in result && result.errorCode === "already_installed") {
    return Boolean((window as MiniKitHostWindow).MiniKit)
  }

  return false
}

export function MainUI() {
  const t = useTranslations()
  const { keyboardOpen } = useMobileViewport()
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [mapVenues, setMapVenues] = useState<MapVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [isMiniKitReady, setIsMiniKitReady] = useState(isWorldDevBypassEnabled)
  const [selectedStation, setSelectedStation] = useState<MapVenue | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSubmitPageOpen, setIsSubmitPageOpen] = useState(false)
  const [isLoadingStations, setIsLoadingStations] = useState(false)
  const [isMapCompassVisible, setIsMapCompassVisible] = useState(false)
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false)
  const [addStoreStep, setAddStoreStep] = useState<AddStoreStep>("location")
  const [isSubmittingStore, setIsSubmittingStore] = useState(false)
  const [isResolvingStoreLocation, setIsResolvingStoreLocation] = useState(false)
  const [storeName, setStoreName] = useState("")
  const [storeAddress, setStoreAddress] = useState("")
  const [storeNotes, setStoreNotes] = useState("")
  const [storeCategory, setStoreCategory] = useState<"grocery_store" | "gas_station">("grocery_store")
  const [storeError, setStoreError] = useState<string | null>(null)
  const [storeFieldErrors, setStoreFieldErrors] = useState<Record<StoreFormField, boolean>>({
    storeName: false,
    storeAddress: false,
  })
  const [selectedStoreLocation, setSelectedStoreLocation] = useState<UserLocation | null>(null)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const { captureMode, setCaptureMode } = useCaptureMode()
  const [, forceMapStatsRender] = useState(0)

  // Shared station data state (persists across tab switches)
  const [stationData, setStationData] = useState<Record<string, {
    submissionCount: number
    potentialEarning: number
    latestPrice?: number
    latestFuelType?: string
    priceUpdatedAt?: string
  }>>({})
  const [isLoadingStationData, setIsLoadingStationData] = useState(false)

  const boundsChangeTimeout = useRef<NodeJS.Timeout | null>(null)
  const queryCacheRef = useRef<Map<string, { expiresAt: number; data: StationMapItem[] }>>(new Map())
  const inFlightRef = useRef<Map<string, Promise<StationMapItem[]>>>(new Map())
  const activeBoundsControllerRef = useRef<AbortController | null>(null)
  const fetchedBoundsRef = useRef<Array<{ bounds: MapBounds; fetchedAt: number }>>([])
  const lastViewportRef = useRef<{ center: UserLocation; latSpan: number; lngSpan: number } | null>(null)
  const mapCallStatsRef = useRef({
    lookups: 0,
    networkCalls: 0,
    cacheHits: 0,
    inflightJoins: 0,
    skippedStableViewport: 0,
    skippedCoveredViewport: 0,
    aborted: 0,
  })
  const mapCenterRef = useRef<UserLocation | null>(null)
  const isSelectingStoreLocation = isAddStoreOpen && addStoreStep === "location"

  const mapToVenue = (item: StationMapItem, location: UserLocation): MapVenue => ({
    id: item.id,
    name: item.name,
    address: item.address || "",
    latitude: item.latitude,
    longitude: item.longitude,
    distance:
      typeof item.distance === "number"
        ? item.distance
        : calculateDistance(location.latitude, location.longitude, item.latitude, item.longitude),
    placeId: item.placeId,
    types: item.types ?? [],
    categories: item.categories ?? ["gas_station"],
    primaryCategory: item.primaryCategory ?? "gas_station",
    submissionMode: item.submissionMode ?? "fuel_submit",
    source: item.source ?? "provider",
    sourcePlaceIds: item.sourcePlaceIds ?? [item.placeId],
  })

  function pruneQueryCache() {
    const now = Date.now()
    for (const [key, value] of queryCacheRef.current) {
      if (value.expiresAt <= now) {
        queryCacheRef.current.delete(key)
      }
    }
    while (queryCacheRef.current.size > MAX_QUERY_CACHE_ENTRIES) {
      const oldestKey = queryCacheRef.current.keys().next().value as string | undefined
      if (!oldestKey) break
      queryCacheRef.current.delete(oldestKey)
    }
  }

  function getCachedQuery(key: string) {
    pruneQueryCache()
    const cached = queryCacheRef.current.get(key)
    if (!cached) return null
    if (cached.expiresAt <= Date.now()) {
      queryCacheRef.current.delete(key)
      return null
    }
    return cached.data
  }

  function setCachedQuery(key: string, data: StationMapItem[]) {
    pruneQueryCache()
    queryCacheRef.current.set(key, {
      data,
      expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
    })
  }

  function trackMapStat(key: keyof typeof mapCallStatsRef.current, amount = 1) {
    mapCallStatsRef.current[key] += amount
    if (process.env.NODE_ENV !== "production") {
      forceMapStatsRender((value) => (value + 1) % 1_000_000)
    }
    const totalLookups = mapCallStatsRef.current.lookups
    if (process.env.NODE_ENV !== "production" && totalLookups > 0 && totalLookups % 10 === 0) {
      console.debug("[maps] call stats", mapCallStatsRef.current)
    }
  }

  function pruneFetchedBounds() {
    const cutoff = Date.now() - FETCHED_BOUNDS_TTL_MS
    fetchedBoundsRef.current = fetchedBoundsRef.current.filter((entry) => entry.fetchedAt >= cutoff)
  }

  function recordFetchedBounds(bounds: MapBounds) {
    pruneFetchedBounds()
    fetchedBoundsRef.current.push({ bounds, fetchedAt: Date.now() })
    if (fetchedBoundsRef.current.length > 120) {
      fetchedBoundsRef.current = fetchedBoundsRef.current.slice(-120)
    }
  }

  function isBoundsCovered(bounds: MapBounds) {
    pruneFetchedBounds()
    return fetchedBoundsRef.current.some((entry) => boundsContains(entry.bounds, bounds))
  }

  function mergeUniqueVenues(existing: MapVenue[], incoming: MapVenue[]) {
    const map = new Map<string, MapVenue>()
    for (const venue of [...existing, ...incoming]) {
      const current = map.get(venue.id)
      if (!current) {
        map.set(venue.id, venue)
        continue
      }

      map.set(venue.id, {
        ...current,
        ...venue,
        categories: Array.from(new Set([...(current.categories ?? []), ...(venue.categories ?? [])])),
        sourcePlaceIds: Array.from(new Set([...(current.sourcePlaceIds ?? []), ...(venue.sourcePlaceIds ?? [])])),
        types: Array.from(new Set([...(current.types ?? []), ...(venue.types ?? [])])),
        submissionMode:
          (current.categories ?? []).includes("gas_station") || (venue.categories ?? []).includes("gas_station")
            ? "fuel_submit"
            : "read_only",
        primaryCategory:
          (current.categories ?? []).includes("grocery_store") || (venue.categories ?? []).includes("grocery_store")
            ? "grocery_store"
            : "gas_station",
      })
    }

    return Array.from(map.values()).sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  async function fetchMapSearch(
    endpoint: "/api/maps/search-nearby" | "/api/maps/search-bounds",
    payload: Record<string, unknown>,
    cacheKey: string,
    signal?: AbortSignal
  ) {
    trackMapStat("lookups")
    const cached = getCachedQuery(cacheKey)
    if (cached) {
      trackMapStat("cacheHits")
      return { stations: cached, source: "cache" as const }
    }

    const inFlight = inFlightRef.current.get(cacheKey)
    if (inFlight) {
      trackMapStat("inflightJoins")
      return {
        stations: await inFlight,
        source: "inflight" as const,
      }
    }

    const task = (async () => {
      trackMapStat("networkCalls")
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.warn(`Map search failed (${endpoint})`, response.status, errorBody)
        return [] as StationMapItem[]
      }

      const data = (await response.json()) as { stations?: StationMapItem[] }
      const stations = data.stations ?? []
      setCachedQuery(cacheKey, stations)
      return stations
    })()

    inFlightRef.current.set(cacheKey, task)
    try {
      return {
        stations: await task,
        source: "network" as const,
      }
    } finally {
      inFlightRef.current.delete(cacheKey)
    }
  }

  useEffect(() => {
    if (isWorldDevBypassEnabled) {
      return
    }

    let cancelled = false
    let tries = 0
    const MAX_TRIES = 50
    const pollMiniKit = () => {
      if (typeof window === "undefined") return
      try {
        if (ensureMiniKitReady()) {
          if (!cancelled) setIsMiniKitReady(true)
          return
        }
      } catch {
        // Swallow errors during early boot; keep polling
      }
      if (tries < MAX_TRIES) {
        tries += 1
        setTimeout(pollMiniKit, 150)
      } else {
        // Some World App builds delay bridge init. Keep polling slowly when the UA matches.
        try {
          const ua = navigator.userAgent || ""
          const looksLikeWorldApp = looksLikeWorldAppUserAgent(ua)
          if (looksLikeWorldApp) {
            setTimeout(pollMiniKit, 1000)
            return
          }
        } catch {}
        if (isWorldDevBypassEnabled) {
          console.warn("MiniKit is unavailable in browser bypass mode.")
        }
      }
    }
    pollMiniKit()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // Only start loading location after MiniKit is ready
    if (!isMiniKitReady) return

    const fetchNearbyVenues = async (location: UserLocation) => {
      try {
        const cacheKey = [
          "nearby",
          location.latitude.toFixed(4),
          location.longitude.toFixed(4),
          DEFAULT_RADIUS_METERS,
          MAP_CATEGORIES.join(","),
        ].join(":")

        const result = await fetchMapSearch(
          "/api/maps/search-nearby",
          {
            latitude: location.latitude,
            longitude: location.longitude,
            radiusMeters: DEFAULT_RADIUS_METERS,
            categories: MAP_CATEGORIES,
          },
          cacheKey
        )

        const venues = result.stations.map((item) => mapToVenue(item, location))
        setMapVenues(venues)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching nearby places", error)
        setLoading(false)
      }
    }

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          setUserLocation(location)
          mapCenterRef.current = location
          fetchNearbyVenues(location)
        },
        (error) => {
          if (isWorldDevBypassEnabled) {
            console.warn("Geolocation unavailable in browser bypass mode", error)
          } else {
            console.error('Error getting location', error)
          }
          setLoading(false)
        }
      )
    } else {
      if (isWorldDevBypassEnabled) {
        console.warn("Geolocation not supported in this browser.")
      } else {
        console.error('Geolocation not supported')
      }
      setTimeout(() => setLoading(false), 0)
    }
  }, [isMiniKitReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle map bounds changes for dynamic loading (debounced)
  const handleBoundsChanged = async (center: UserLocation, bounds: MapBounds) => {
    if (!userLocation) return
    mapCenterRef.current = center

    if (isSelectingStoreLocation) {
      return
    }

    // Clear any pending timeout
    if (boundsChangeTimeout.current) {
      clearTimeout(boundsChangeTimeout.current)
    }

    // Debounce: wait shortly after last bounds change before fetching
    boundsChangeTimeout.current = setTimeout(async () => {
      const viewport = getViewportSnapshot(bounds)
      const previousViewport = lastViewportRef.current
      lastViewportRef.current = viewport

      if (previousViewport) {
        const movedMeters = calculateDistance(
          previousViewport.center.latitude,
          previousViewport.center.longitude,
          viewport.center.latitude,
          viewport.center.longitude
        )
        const zoomRatio = viewport.latSpan / Math.max(previousViewport.latSpan, 0.00001)
        const isMinorViewportChange = movedMeters < 180 && zoomRatio > 0.9 && zoomRatio < 1.1
        if (isMinorViewportChange) {
          trackMapStat("skippedStableViewport")
          return
        }

        const isZoomingIn = zoomRatio < 0.9
        if (isZoomingIn && isBoundsCovered(bounds)) {
          trackMapStat("skippedCoveredViewport")
          return
        }
      }

      const existingStationsInBounds = mapVenues.filter((station) => isStationInBounds(station, bounds))
      const targetResults = getBoundsResultTarget(bounds)

      // Fetch if visible area is sparse.
      if (existingStationsInBounds.length < targetResults) {
        if (isBoundsCovered(bounds)) {
          trackMapStat("skippedCoveredViewport")
          return
        }
        await fetchVenuesInBounds(bounds)
      }
    }, BOUNDS_DEBOUNCE_MS)
  }

  const fetchVenuesInBounds = async (bounds: MapBounds) => {
    try {
      if (!userLocation) return

      const { northEast, southWest } = bounds
      const boundsKey = [
        "bounds",
        northEast.lat.toFixed(4),
        northEast.lng.toFixed(4),
        southWest.lat.toFixed(4),
        southWest.lng.toFixed(4),
        MAP_CATEGORIES.join(","),
      ].join(":")

      if (activeBoundsControllerRef.current) {
        activeBoundsControllerRef.current.abort()
        trackMapStat("aborted")
      }

      const controller = new AbortController()
      activeBoundsControllerRef.current = controller

      const cached = getCachedQuery(boundsKey)
      const hasInFlight = inFlightRef.current.has(boundsKey)
      if (!cached && !hasInFlight) {
        setIsLoadingStations(true)
      }

      const result = await fetchMapSearch(
        "/api/maps/search-bounds",
        {
          northEast,
          southWest,
          categories: MAP_CATEGORIES,
        },
        boundsKey,
        controller.signal
      )

      if (result.source === "network") {
        recordFetchedBounds(bounds)
      }

      const incoming = result.stations.map((item) => mapToVenue(item, userLocation))
      if (incoming.length > 0) {
        setMapVenues((prev) => mergeUniqueVenues(prev, incoming))
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Error fetching places in bounds:", error)
      }
    } finally {
      setIsLoadingStations(false)
    }
  }

  const isStationInBounds = (station: MapVenue, bounds: MapBounds) => {
    return (
      station.latitude <= bounds.northEast.lat &&
      station.latitude >= bounds.southWest.lat &&
      station.longitude <= bounds.northEast.lng &&
      station.longitude >= bounds.southWest.lng
    )
  }

  const boundsContains = (outer: MapBounds, inner: MapBounds) => {
    return (
      inner.northEast.lat <= outer.northEast.lat &&
      inner.northEast.lng <= outer.northEast.lng &&
      inner.southWest.lat >= outer.southWest.lat &&
      inner.southWest.lng >= outer.southWest.lng
    )
  }

  const getViewportSnapshot = (bounds: MapBounds) => {
    return {
      center: {
        latitude: (bounds.northEast.lat + bounds.southWest.lat) / 2,
        longitude: (bounds.northEast.lng + bounds.southWest.lng) / 2,
      },
      latSpan: Math.abs(bounds.northEast.lat - bounds.southWest.lat),
      lngSpan: Math.abs(bounds.northEast.lng - bounds.southWest.lng),
    }
  }

  const getBoundsResultTarget = (bounds: MapBounds) => {
    const latSpan = Math.abs(bounds.northEast.lat - bounds.southWest.lat)
    const lngSpan = Math.abs(bounds.northEast.lng - bounds.southWest.lng)
    const maxSpan = Math.max(latSpan, lngSpan)

    const base =
      maxSpan <= 0.06
        ? 18
        : maxSpan <= 0.15
          ? 24
          : maxSpan <= 0.35
            ? 32
            : 42

    return Math.min(MAX_BOUNDS_RESULTS, Math.max(MIN_BOUNDS_RESULTS, base))
  }

  const handleStationSelect = (station: MapVenue) => {
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

  const handleOpenSubmitPage = () => {
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

  const handleOpenAddStore = () => {
    setIsDrawerOpen(false)
    setSelectedStation(null)
    setStoreError(null)
    setStoreName("")
    setStoreAddress("")
    setStoreNotes("")
    setStoreCategory("grocery_store")
    setStoreFieldErrors({ storeName: false, storeAddress: false })
    setSelectedStoreLocation(mapCenterRef.current ?? userLocation)
    setAddStoreStep("location")
    setIsAddStoreOpen(true)
  }

  const handleCloseAddStore = () => {
    setIsAddStoreOpen(false)
    setAddStoreStep("location")
    setSelectedStoreLocation(null)
    setIsResolvingStoreLocation(false)
    setStoreError(null)
    setStoreFieldErrors({ storeName: false, storeAddress: false })
  }

  const handleContinueAddStore = async () => {
    const center = mapCenterRef.current ?? userLocation
    if (!center) {
      setStoreError(t("map.addStoreErrors.locationUnavailable"))
      return
    }

    setIsResolvingStoreLocation(true)
    setStoreError(null)

    try {
      const resolvedAddress = await reverseGeocodeCoordinate(center)
      setSelectedStoreLocation(center)
      setStoreAddress(resolvedAddress ?? "")
      setAddStoreStep("details")
    } catch (error) {
      console.error("Error reverse geocoding store location", error)
      setSelectedStoreLocation(center)
      setStoreAddress("")
      setAddStoreStep("details")
    } finally {
      setIsResolvingStoreLocation(false)
    }
  }

  const handleBackToLocationStep = () => {
    setStoreError(null)
    setAddStoreStep("location")
  }

  const getStoreFieldErrors = () => {
    const trimmedName = storeName.trim()
    const trimmedAddress = storeAddress.trim()

    return {
      storeName: trimmedName.length < 2,
      storeAddress: trimmedAddress.length < 3,
    }
  }

  const handleSubmitAddStore = async () => {
    if (!selectedStoreLocation) {
      setStoreError(t("map.addStoreErrors.locationUnavailable"))
      return
    }

    const trimmedName = storeName.trim()
    const trimmedAddress = storeAddress.trim()
    const nextFieldErrors = getStoreFieldErrors()
    setStoreFieldErrors(nextFieldErrors)

    if (nextFieldErrors.storeName) {
      setStoreError(t("map.addStoreErrors.invalidName"))
      return
    }
    if (nextFieldErrors.storeAddress) {
      setStoreError(t("map.addStoreErrors.invalidAddress"))
      return
    }

    setIsSubmittingStore(true)
    setStoreError(null)

    try {
      const response = await fetch("/api/pois/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          address: trimmedAddress,
          notes: storeNotes.trim() || undefined,
          latitude: selectedStoreLocation.latitude,
          longitude: selectedStoreLocation.longitude,
          categories: [storeCategory],
          primaryCategory: storeCategory,
        }),
      })

      const result = (await response.json()) as {
        error?: string
        poi?: StationMapItem
        status?: "published" | "duplicate_resolved"
      }

      if (!response.ok || result.error) {
        setStoreError(result.error ?? t("map.addStoreErrors.submitFailed"))
        return
      }

      if (result.poi && userLocation) {
        const venue = mapToVenue(result.poi, userLocation)
        setMapVenues((prev) => mergeUniqueVenues(prev, [venue]))
        setSelectedStation(venue)
        setIsDrawerOpen(true)
      }

      setIsAddStoreOpen(false)
    } catch (error) {
      console.error("Error creating store proposal", error)
      setStoreError(t("map.addStoreErrors.submitFailed"))
    } finally {
      setIsSubmittingStore(false)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (boundsChangeTimeout.current) {
        clearTimeout(boundsChangeTimeout.current)
      }
      if (activeBoundsControllerRef.current) {
        activeBoundsControllerRef.current.abort()
      }
    }
  }, [])

  const tabs = [
    { id: "map" as Tab, icon: MapIcon, label: t('mainUI.tabs.map') },
    { id: "home" as Tab, icon: Home, label: t('mainUI.tabs.home') },
    { id: "wallet" as Tab, icon: Wallet, label: t('mainUI.tabs.wallet') },
  ]
  const addStoreButtonBottom = isMapCompassVisible
    ? "calc(env(safe-area-inset-bottom, 0px) + 4.75rem)"
    : "calc(env(safe-area-inset-bottom, 0px) + 0.35rem)"

  if (loading || !isMiniKitReady) {
    return (
      <MobileScreen className="items-center justify-center bg-[#F4F4F8]" contentClassName="flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-full border-4 border-[#7DD756] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        </div>
      </MobileScreen>
    )
  }

  return (
    <MobileScreen
      className="bg-[var(--valor-bg)]"
      contentClassName="relative overflow-hidden"
      footer={
        keyboardOpen ? null : (
          <nav
            className="relative border-t border-black/5 bg-white/95 backdrop-blur"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + var(--spacing-md))",
              paddingTop: "var(--spacing-xs)",
            }}
          >
            <div className="safe-px-app flex items-center justify-around gap-2 px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className="flex min-h-11 min-w-[84px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs text-gray-500 active:scale-[0.99]"
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${isActive ? "bg-[#7DD756]/10" : ""}`}>
                      <Icon size={22} className={isActive ? "text-[#7DD756]" : "text-gray-500"} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={isActive ? "text-[#7DD756]" : ""}>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )
      }
    >
      <main className="relative h-full overflow-hidden">
        {activeTab === "map" && (
          <div className="relative h-full">
            <AppleMapView
              userLocation={userLocation}
              venues={mapVenues}
              onStationSelect={handleStationSelect}
              onBoundsChanged={handleBoundsChanged}
              isLoadingStations={isLoadingStations}
              locationSelectionActive={isSelectingStoreLocation}
              disableVenueSelection={isSelectingStoreLocation}
              onCompassVisibilityChange={setIsMapCompassVisible}
              debugStats={process.env.NODE_ENV !== "production" ? { ...mapCallStatsRef.current } : undefined}
            />
            {!isAddStoreOpen && !isDrawerOpen ? (
              <button
                type="button"
                onClick={handleOpenAddStore}
                className="absolute z-[60] inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--valor-green)] px-4 text-sm text-white shadow-lg active:scale-95"
                style={{
                  right: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
                  bottom: addStoreButtonBottom,
                }}
              >
                <Plus size={16} />
                {t("map.addStore")}
              </button>
            ) : null}
          </div>
        )}
        {activeTab === "home" && (
          <HomeTab
            gasStations={mapVenues}
            userLocation={userLocation}
            onStationSelect={handleStationSelect}
            stationData={stationData}
            setStationData={setStationData}
            isLoadingStationData={isLoadingStationData}
            setIsLoadingStationData={setIsLoadingStationData}
          />
        )}
        {activeTab === "wallet" && (
          <WalletTab
            onOpenSettings={() => setIsSettingsOpen(true)}
            captureMode={captureMode}
          />
        )}
      </main>

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
        captureMode={captureMode}
        setCaptureMode={setCaptureMode}
      />

      <BottomSheet
        isOpen={isAddStoreOpen}
        onClose={handleCloseAddStore}
        title={addStoreStep === "location" ? t("map.selectLocationTitle") : t("map.storeDetailsTitle")}
        description={undefined}
        closeLabel={t("common.close")}
        blocking={addStoreStep !== "location"}
        showCloseButton={addStoreStep !== "location"}
        header={
          <div className={addStoreStep === "location" ? "" : "pr-16 pb-1"}>
            <h3 className="text-lg text-[#1C1C1E]">
              {addStoreStep === "location" ? t("map.selectLocationTitle") : t("map.storeDetailsTitle")}
            </h3>
          </div>
        }
        footer={
          <StickyActionBar className="border-t border-black/5 bg-white" innerClassName="grid grid-cols-2 gap-3 px-4 pt-2.5">
            {addStoreStep === "location" ? (
              <>
                <button
                  type="button"
                  onClick={handleCloseAddStore}
                  disabled={isResolvingStoreLocation}
                  className="min-h-12 rounded-2xl border border-black/10 px-4 text-sm text-[#1C1C1E] active:scale-[0.99] disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleContinueAddStore}
                  disabled={isResolvingStoreLocation}
                  className="min-h-12 rounded-2xl bg-[var(--valor-green)] px-4 text-sm text-white active:scale-[0.99] disabled:opacity-50"
                >
                  {isResolvingStoreLocation ? t("map.findingAddress") : t("common.continue")}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBackToLocationStep}
                  disabled={isSubmittingStore}
                  className="min-h-12 rounded-2xl border border-black/10 px-4 text-sm text-[#1C1C1E] active:scale-[0.99] disabled:opacity-50"
                >
                  {t("common.back")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAddStore}
                  disabled={isSubmittingStore}
                  className="min-h-12 rounded-2xl bg-[var(--valor-green)] px-4 text-sm text-white active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmittingStore ? t("common.loading") : t("map.submitStore")}
                </button>
              </>
            )}
          </StickyActionBar>
        }
        bodyClassName={addStoreStep === "location" ? "justify-end gap-2" : "gap-3"}
      >
        {addStoreStep === "location" ? (
          <>
            {storeError ? <p className="text-sm text-red-600">{storeError}</p> : null}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="px-1 text-xs text-gray-500">
                  {t("map.storeNameLabel")} <span className="text-red-500">*</span>
                </span>
                <input
                  value={storeName}
                  onChange={(event) => {
                    const value = event.target.value
                    setStoreName(value)
                    if (storeFieldErrors.storeName && value.trim().length >= 2) {
                      setStoreFieldErrors((prev) => ({ ...prev, storeName: false }))
                    }
                    if (storeError) {
                      setStoreError(null)
                    }
                  }}
                  placeholder={t("map.storeNamePlaceholder")}
                  aria-invalid={storeFieldErrors.storeName}
                  className={cn(
                    "min-h-12 w-full rounded-2xl border px-4 text-sm focus:outline-none",
                    storeFieldErrors.storeName
                      ? "border-red-500 bg-red-50/40 focus:border-red-500"
                      : "border-black/10 focus:border-[var(--valor-green)]"
                  )}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="px-1 text-xs text-gray-500">
                  {t("map.storeAddressLabel")} <span className="text-red-500">*</span>
                </span>
                <input
                  value={storeAddress}
                  onChange={(event) => {
                    const value = event.target.value
                    setStoreAddress(value)
                    if (storeFieldErrors.storeAddress && value.trim().length >= 3) {
                      setStoreFieldErrors((prev) => ({ ...prev, storeAddress: false }))
                    }
                    if (storeError) {
                      setStoreError(null)
                    }
                  }}
                  placeholder={t("map.storeAddressPlaceholder")}
                  aria-invalid={storeFieldErrors.storeAddress}
                  className={cn(
                    "min-h-12 w-full rounded-2xl border px-4 text-sm focus:outline-none",
                    storeFieldErrors.storeAddress
                      ? "border-red-500 bg-red-50/40 focus:border-red-500"
                      : "border-black/10 focus:border-[var(--valor-green)]"
                  )}
                />
              </label>
              <select
                value={storeCategory}
                onChange={(event) => setStoreCategory(event.target.value as "grocery_store" | "gas_station")}
                className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm focus:border-[var(--valor-green)] focus:outline-none"
              >
                <option value="grocery_store">{t("map.categoryGrocery")}</option>
                <option value="gas_station">{t("map.categoryGas")}</option>
              </select>
              <textarea
                value={storeNotes}
                onChange={(event) => setStoreNotes(event.target.value)}
                placeholder={t("map.storeNotesPlaceholder")}
                className="min-h-24 w-full resize-none rounded-2xl border border-black/10 px-4 py-3 text-sm focus:border-[var(--valor-green)] focus:outline-none"
              />
            </div>
            {storeError ? <p className="text-sm text-red-600">{storeError}</p> : null}
          </>
        )}
      </BottomSheet>
    </MobileScreen>
  )
}
