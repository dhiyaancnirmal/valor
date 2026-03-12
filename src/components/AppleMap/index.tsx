"use client"

import { useEffect, useRef, useState } from "react"
import { Navigation } from "lucide-react"
import { useTranslations } from "next-intl"
import { MapVenue, UserLocation } from "@/types"
import { calculateDistance, cn } from "@/lib/utils"

export interface MapBounds {
  northEast: { lat: number; lng: number }
  southWest: { lat: number; lng: number }
}

interface AppleMapViewProps {
  userLocation: UserLocation | null
  venues: MapVenue[]
  onStationSelect: (station: MapVenue) => void
  onBoundsChanged?: (center: UserLocation, bounds: MapBounds) => void
  isLoadingStations?: boolean
  locationSelectionActive?: boolean
  disableVenueSelection?: boolean
  onCompassVisibilityChange?: (visible: boolean) => void
  debugStats?: {
    lookups: number
    networkCalls: number
    cacheHits: number
    inflightJoins: number
    skippedStableViewport: number
    skippedCoveredViewport: number
    aborted: number
  }
}

declare global {
  interface Window {
    mapkit?: MapKitGlobal
    __valorMapKitReady?: () => void
    __valorMapKitLoadPromise?: Promise<MapKitGlobal>
  }
}

type ClusterData = {
  center: MapKitCoordinate
  count: number
}

type MapKitEvent = {
  annotation?: { stationData?: MapVenue; clusterData?: ClusterData }
}

type MapKitAnnotation = {
  stationData?: MapVenue
  clusterData?: ClusterData
}

type MapKitCoordinate = {
  latitude: number
  longitude: number
}

type MapKitRegion = {
  center?: MapKitCoordinate
  span?: {
    latitudeDelta?: number
    longitudeDelta?: number
  }
}

type MapKitMap = {
  region?: MapKitRegion
  rotation?: number
  showsPointsOfInterest?: boolean
  addEventListener: (eventType: string, listener: (event: MapKitEvent) => void) => void
  addAnnotation: (annotation: MapKitAnnotation) => void
  removeAnnotations: (annotations: MapKitAnnotation[]) => void
  setRotationAnimated?: (degrees: number, animated: boolean) => void
}

type MapKitGlobal = {
  loadedLibraries: string[]
  init: (options: { authorizationCallback: (done: (token: string) => void) => void }) => void
  Map: new (container: HTMLElement) => MapKitMap
  Geocoder: new (options?: { language?: string }) => MapKitGeocoder
  Coordinate: new (latitude: number, longitude: number) => MapKitCoordinate
  CoordinateSpan: new (latitudeDelta: number, longitudeDelta: number) => { latitudeDelta: number; longitudeDelta: number }
  CoordinateRegion: new (
    center: MapKitCoordinate,
    span: { latitudeDelta: number; longitudeDelta: number }
  ) => MapKitRegion
  MarkerAnnotation: new (
    coordinate: MapKitCoordinate,
    options?: {
      color?: string
      title?: string
      subtitle?: string
      glyphText?: string
    }
  ) => MapKitAnnotation
}

type MapKitGeocoder = {
  reverseLookup: (
    coordinate: MapKitCoordinate,
    callback: (error: unknown, data: { results?: Array<Record<string, unknown>> } | null) => void
  ) => void
}

let mapKitInitialized = false

export function AppleMapView({
  userLocation,
  venues,
  onStationSelect,
  onBoundsChanged,
  isLoadingStations,
  locationSelectionActive = false,
  disableVenueSelection = false,
  onCompassVisibilityChange,
}: AppleMapViewProps) {
  const t = useTranslations()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<MapKitMap | null>(null)
  const stationAnnotationsRef = useRef<MapKitAnnotation[]>([])
  const userAnnotationRef = useRef<MapKitAnnotation | null>(null)
  const userLocationRef = useRef<UserLocation | null>(userLocation)
  const isInitialLoadRef = useRef(true)
  const [mapReady, setMapReady] = useState(false)
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [isFollowingUser, setIsFollowingUser] = useState(true)
  const [zoomBucket, setZoomBucket] = useState(0)
  const zoomBucketRef = useRef(0)
  const disableVenueSelectionRef = useRef(disableVenueSelection)

  useEffect(() => {
    disableVenueSelectionRef.current = disableVenueSelection
  }, [disableVenueSelection])

  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    onCompassVisibilityChange?.(false)
  }, [onCompassVisibilityChange])

  useEffect(() => {
    let cancelled = false

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return

      try {
        const mapkit = await loadAndInitMapKit()
        if (cancelled || !mapRef.current) return

        const map = new mapkit.Map(mapRef.current)
        map.showsPointsOfInterest = false
        mapInstanceRef.current = map
        setMapReady(true)

        map.addEventListener("select", (event) => {
          if (disableVenueSelectionRef.current) {
            return
          }

          const cluster = event.annotation?.clusterData
          if (cluster && window.mapkit && map.region?.span) {
            const span = map.region.span
            const tighterSpan = new window.mapkit.CoordinateSpan(
              Math.max((span.latitudeDelta ?? 0.02) / 2, 0.002),
              Math.max((span.longitudeDelta ?? 0.02) / 2, 0.002)
            )
            map.region = new window.mapkit.CoordinateRegion(cluster.center, tighterSpan)
            return
          }
          const venue = event.annotation?.stationData
          if (venue) {
            onStationSelect(venue)
          }
        })

        map.addEventListener("region-change-end", () => {
          const region = map.region
          const center = region?.center
          const bounds = region ? regionToBounds(region) : null
          const nextZoomBucket = getZoomBucket(region)
          const compassVisible = Math.abs(map.rotation ?? 0) > 1
          if (nextZoomBucket !== zoomBucketRef.current) {
            zoomBucketRef.current = nextZoomBucket
            setZoomBucket(nextZoomBucket)
          }
          onCompassVisibilityChange?.(compassVisible)
          if (!center || !bounds) return

          if (userLocationRef.current) {
            setIsFollowingUser(isMapCenteredOnUser(userLocationRef.current, center, region))
          }

          onBoundsChanged?.(
            {
              latitude: center.latitude,
              longitude: center.longitude,
            },
            bounds
          )
        })
      } catch (error) {
        console.error("Failed to initialize Apple MapKit", error)
        if (!cancelled) {
          setMapUnavailable(true)
        }
      }
    }

    void initMap()

    return () => {
      cancelled = true
    }
  }, [onBoundsChanged, onStationSelect, onCompassVisibilityChange])

  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !isInitialLoadRef.current) return
    if (!window.mapkit) return

    const mapkit = window.mapkit
    const center = new mapkit.Coordinate(userLocation.latitude, userLocation.longitude)
    const span = new mapkit.CoordinateSpan(0.05, 0.05)
    mapInstanceRef.current.region = new mapkit.CoordinateRegion(center, span)

    const marker = new mapkit.MarkerAnnotation(center, {
      color: "#7DD756",
      title: t("ui.yourLocation"),
    })

    userAnnotationRef.current = marker
    mapInstanceRef.current.addAnnotation(marker)
    isInitialLoadRef.current = false
  }, [mapReady, t, userLocation])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return

    const map = mapInstanceRef.current
    const mapkit = window.mapkit

    if (stationAnnotationsRef.current.length > 0) {
      map.removeAnnotations(stationAnnotationsRef.current)
      stationAnnotationsRef.current = []
    }

    const annotations = buildAnnotations(map, mapkit, venues)
    annotations.forEach((annotation) => map.addAnnotation(annotation))
    stationAnnotationsRef.current = annotations
  }, [venues, zoomBucket])

  const handleRecenterToUser = () => {
    const map = mapInstanceRef.current
    const mapkit = window.mapkit

    if (!map || !mapkit || !userLocation) return

    const center = new mapkit.Coordinate(userLocation.latitude, userLocation.longitude)
    const currentSpan = map.region?.span
    const span = new mapkit.CoordinateSpan(
      currentSpan?.latitudeDelta ?? 0.05,
      currentSpan?.longitudeDelta ?? 0.05
    )

    map.region = new mapkit.CoordinateRegion(center, span)
    setIsFollowingUser(true)
  }

  if (!userLocation) {
    return (
      <div className="h-full bg-gray-100 px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-[28px] border border-black/5 bg-white px-6 py-6 text-center shadow-sm">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-[var(--valor-green)] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-600">{t("map.loadingMap")}</p>
          </div>
        </div>
      </div>
    )
  }

  if (mapUnavailable) {
    return (
      <div className="h-full bg-gray-100 px-4 py-6">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-[28px] border border-black/5 bg-white px-6 py-6 text-center shadow-sm">
            <p className="text-base text-gray-700">{t("map.loadingMap")}</p>
            <p className="mt-2 text-sm text-gray-500">{t("map.providerUnavailable")}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="h-full w-full" />

      {isLoadingStations && !locationSelectionActive ? (
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <div className="h-1.5 bg-[var(--valor-green)]/30">
            <div className="h-full w-1/3 bg-[var(--valor-green)] animate-pulse" />
          </div>
          <div className="safe-px-app mx-3 mt-2 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs text-gray-700 shadow-sm">
            {t("map.findingStations")}
          </div>
        </div>
      ) : null}

      {!locationSelectionActive ? (
        <div className="absolute left-3 z-[9] rounded-xl bg-white/95 px-3 py-2 text-[11px] text-gray-700 shadow-sm safe-top-app">
          <div className="flex items-center gap-2"><span>🛒</span><span>{t("map.legend.grocery")}</span></div>
          <div className="mt-1 flex items-center gap-2"><span>⛽</span><span>{t("map.legend.gas")}</span></div>
          <div className="mt-1 flex items-center gap-2"><span>🛒⛽</span><span>{t("map.legend.mixed")}</span></div>
        </div>
      ) : null}

      <div className="absolute right-3 z-[9] flex flex-col gap-2 safe-top-app">
        <button
          type="button"
          onClick={handleRecenterToUser}
          aria-label="Go to my location"
          title="Go to my location"
          className={cn(
            "flex size-11 items-center justify-center rounded-full border shadow-sm transition active:scale-95",
            isFollowingUser
              ? "border-[var(--valor-green)] bg-[var(--valor-green)] text-white"
              : "border-black/10 bg-white/95 text-gray-500"
          )}
        >
          <Navigation
            aria-hidden="true"
            className={cn(
              "pointer-events-none size-[18px] -rotate-12",
              isFollowingUser ? "fill-current text-white" : "fill-transparent text-gray-500"
            )}
            strokeWidth={2.2}
          />
        </button>
      </div>

      {locationSelectionActive && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[11] -translate-x-1/2 -translate-y-[calc(100%+20px)]">
            <div className="relative flex flex-col items-center">
              <div className="rounded-full border border-white/80 bg-white/92 px-3 py-1 text-[11px] text-[#1C1C1E] shadow-sm">
                {t("map.positionPin")}
              </div>
              <div className="mt-2 text-[46px] leading-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)]">📍</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function buildAnnotations(map: MapKitMap, mapkit: MapKitGlobal, venues: MapVenue[]) {
  const region = map.region
  const latDelta = region?.span?.latitudeDelta ?? 0.05
  const lngDelta = region?.span?.longitudeDelta ?? 0.05
  const effectiveSpan = Math.max(latDelta, lngDelta)

  // Keep individual store markers at normal city zoom levels.
  if (effectiveSpan <= 0.08) {
    return venues.map((venue) => createVenueAnnotation(mapkit, venue))
  }

  const gridDivisor = effectiveSpan > 0.8 ? 10 : effectiveSpan > 0.35 ? 14 : 20
  const cellLat = Math.max(latDelta / gridDivisor, 0.0008)
  const cellLng = Math.max(lngDelta / gridDivisor, 0.0008)

  const buckets = new Map<string, MapVenue[]>()

  for (const venue of venues) {
    const key = `${Math.floor(venue.latitude / cellLat)}:${Math.floor(venue.longitude / cellLng)}`
    const list = buckets.get(key)
    if (list) {
      list.push(venue)
    } else {
      buckets.set(key, [venue])
    }
  }

  const annotations: MapKitAnnotation[] = []

  for (const group of buckets.values()) {
    // Only cluster when a bucket is truly dense.
    if (group.length < 3) {
      for (const venue of group) {
        annotations.push(createVenueAnnotation(mapkit, venue))
      }
      continue
    }

    const centerLat = group.reduce((sum, item) => sum + item.latitude, 0) / group.length
    const centerLng = group.reduce((sum, item) => sum + item.longitude, 0) / group.length
    const center = new mapkit.Coordinate(centerLat, centerLng)
    const annotation = new mapkit.MarkerAnnotation(center, {
      color: "#2563EB",
      title: `${group.length} places`,
      glyphText: String(group.length),
    })
    annotation.clusterData = { center, count: group.length }
    annotations.push(annotation)
  }

  return annotations
}

function createVenueAnnotation(mapkit: MapKitGlobal, venue: MapVenue) {
  const visual = getVenueVisual(venue)
  const coordinate = new mapkit.Coordinate(venue.latitude, venue.longitude)
  const annotation = new mapkit.MarkerAnnotation(coordinate, {
    color: visual.color,
    title: venue.name,
    subtitle: venue.address,
    glyphText: visual.glyph,
  })
  annotation.stationData = venue
  return annotation
}

function getVenueVisual(venue: MapVenue) {
  const categories = new Set(venue.categories ?? [])
  const hasGas = categories.has("gas_station")
  const hasGrocery = categories.has("grocery_store")

  if (hasGas && hasGrocery) {
    return { glyph: "🛒⛽", color: "#FACC15" }
  }
  if (hasGrocery) {
    return { glyph: "🛒", color: "#10B981" }
  }
  return { glyph: "⛽", color: "#FF9500" }
}

async function loadAndInitMapKit() {
  const mapkit = await ensureMapKitLoaded()

  if (!mapKitInitialized) {
    const initialToken = await fetchMapToken()

    mapkit.init({
      authorizationCallback: (done) => {
        void fetchMapToken()
          .then((token) => done(token))
          .catch((error) => {
            console.error("Failed to refresh Apple Maps token", error)
            done(initialToken)
          })
      },
    })
    mapKitInitialized = true
  }

  return mapkit
}

async function ensureMapKitLoaded() {
  if (window.mapkit && window.mapkit.loadedLibraries?.length > 0) {
    return window.mapkit
  }

  if (window.__valorMapKitLoadPromise) {
    return window.__valorMapKitLoadPromise
  }

  window.__valorMapKitLoadPromise = new Promise<MapKitGlobal>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-valor-mapkit='true']")
    if (existingScript) {
      const timer = window.setInterval(() => {
        if (window.mapkit && window.mapkit.loadedLibraries?.length > 0) {
          window.clearInterval(timer)
          resolve(window.mapkit)
        }
      }, 50)
      window.setTimeout(() => {
        window.clearInterval(timer)
        reject(new Error("Timed out waiting for Apple MapKit to load"))
      }, 10_000)
      return
    }

    window.__valorMapKitReady = () => {
      if (!window.mapkit) {
        reject(new Error("MapKit loaded callback fired without window.mapkit"))
        return
      }
      resolve(window.mapkit)
      delete window.__valorMapKitReady
    }

    const script = document.createElement("script")
    script.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js"
    script.async = true
    script.crossOrigin = "anonymous"
    script.dataset.callback = "__valorMapKitReady"
    script.dataset.libraries = "map,annotations,services"
    script.dataset.valorMapkit = "true"
    script.onerror = () => reject(new Error("Failed to load Apple MapKit script"))
    document.head.appendChild(script)
  })

  return window.__valorMapKitLoadPromise
}

function isMapCenteredOnUser(userLocation: UserLocation, center: MapKitCoordinate, region?: MapKitRegion) {
  const distanceFromUser = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    center.latitude,
    center.longitude
  )
  const latSpanMeters = Math.max((region?.span?.latitudeDelta ?? 0.05) * 111_000, 60)
  const thresholdMeters = Math.min(250, Math.max(50, latSpanMeters / 6))

  return distanceFromUser <= thresholdMeters
}

function regionToBounds(region: MapKitRegion): MapBounds | null {
  const center = region.center
  const span = region.span
  const latDelta = span?.latitudeDelta
  const lngDelta = span?.longitudeDelta

  if (!center || typeof latDelta !== "number" || typeof lngDelta !== "number") {
    return null
  }

  return {
    northEast: {
      lat: center.latitude + latDelta / 2,
      lng: center.longitude + lngDelta / 2,
    },
    southWest: {
      lat: center.latitude - latDelta / 2,
      lng: center.longitude - lngDelta / 2,
    },
  }
}

function getZoomBucket(region?: MapKitRegion) {
  const latDelta = region?.span?.latitudeDelta
  const lngDelta = region?.span?.longitudeDelta
  const effectiveSpan = Math.max(latDelta ?? 0.05, lngDelta ?? 0.05)
  // Bucketed zoom index: smaller span => higher zoom bucket.
  const zoomLevel = Math.max(0, Math.round(Math.log2(360 / Math.max(effectiveSpan, 0.0001))))
  return Math.floor(zoomLevel / 2)
}

async function fetchMapToken() {
  const response = await fetch("/api/maps/token", { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`Failed to fetch map token (${response.status})`)
  }

  const data = (await response.json()) as { token?: string }
  if (!data.token) {
    throw new Error("Missing token in /api/maps/token response")
  }

  return data.token
}

export async function reverseGeocodeCoordinate(location: UserLocation) {
  const mapkit = await loadAndInitMapKit()
  const geocoder = new mapkit.Geocoder({ language: "en-US" })

  return new Promise<string | null>((resolve, reject) => {
    const coordinate = new mapkit.Coordinate(location.latitude, location.longitude)
    geocoder.reverseLookup(coordinate, (error, data) => {
      if (error) {
        reject(error)
        return
      }

      const firstResult = Array.isArray(data?.results) ? data.results[0] : null
      if (!firstResult) {
        resolve(null)
        return
      }

      const formattedAddress = extractFormattedAddress(firstResult)
      resolve(formattedAddress)
    })
  })
}

function extractFormattedAddress(result: Record<string, unknown>) {
  const formattedAddress = result.formattedAddress
  if (typeof formattedAddress === "string" && formattedAddress.trim().length > 0) {
    return formattedAddress.trim()
  }

  const formattedAddressLines = result.formattedAddressLines
  if (Array.isArray(formattedAddressLines) && formattedAddressLines.length > 0) {
    const joined = formattedAddressLines
      .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
      .join(", ")
      .trim()
    if (joined.length > 0) {
      return joined
    }
  }

  const structuredAddress = result.structuredAddress
  if (structuredAddress && typeof structuredAddress === "object") {
    const parts = [
      (structuredAddress as { fullThoroughfare?: unknown }).fullThoroughfare,
      (structuredAddress as { locality?: unknown }).locality,
      (structuredAddress as { administrativeArea?: unknown }).administrativeArea,
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())

    if (parts.length > 0) {
      return parts.join(", ")
    }
  }

  const name = result.name
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim()
  }

  return null
}
