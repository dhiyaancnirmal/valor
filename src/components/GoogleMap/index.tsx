"use client"

import { useEffect, useRef, useState } from "react"
import { GasStation, UserLocation } from "@/types"

// Extend window interface for Google Maps
declare global {
  interface Window {
    google: any
  }
}

interface GoogleMapViewProps {
  userLocation: UserLocation | null
  gasStations: GasStation[]
  onStationSelect: (station: GasStation) => void
  onBoundsChanged?: (center: UserLocation, bounds: google.maps.LatLngBounds) => void
  isLoadingStations?: boolean
}

export function GoogleMapView({ userLocation, gasStations, onStationSelect, onBoundsChanged, isLoadingStations }: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const isInitialLoadRef = useRef(true)

  // Initialize map only once when component mounts and Google Maps API is ready
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google || googleMapRef.current) return

      // Initialize map without centering initially
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 0, lng: 0 }, // Default center, will be updated when userLocation is available
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      googleMapRef.current = map

      // Add event listeners for dynamic loading
      if (onBoundsChanged) {
        let boundsTimeout: NodeJS.Timeout
        let lastBoundsCheck = Date.now()

        const handleBoundsChanged = () => {
          const now = Date.now()
          // Only check bounds if it's been at least 1 second since last check
          // This prevents excessive API calls during rapid map movements
          if (now - lastBoundsCheck < 1000) return

          lastBoundsCheck = now

          const bounds = map.getBounds()
          if (bounds) {
            const center = bounds.getCenter()
            const newCenter = {
              latitude: center.lat(),
              longitude: center.lng()
            }
            onBoundsChanged(newCenter, bounds)
          }
        }

        // Listen for map idle event (fires when map stops moving)
        map.addListener('idle', () => {
          // Small delay to ensure map has fully settled
          setTimeout(handleBoundsChanged, 200)
        })
      }
    }

    // Wait for Google Maps API to load if it's not ready yet
    if (window.google && window.google.maps) {
      initMap()
    } else {
      // Wait for the Google Maps script to load
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          initMap()
        } else {
          setTimeout(checkGoogleMaps, 100)
        }
      }
      checkGoogleMaps()
    }
  }, [onBoundsChanged]) // Only depend on onBoundsChanged, not userLocation

  // Center map on user location only for initial load
  useEffect(() => {
    if (!googleMapRef.current || !userLocation || !isInitialLoadRef.current) return

    // Center map on user location for initial load
    googleMapRef.current.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude })

    // Add user location marker (only once)
    const userMarker = new google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#7DD756",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
          title: "Your Location",
    })
    userMarkerRef.current = userMarker

    isInitialLoadRef.current = false
  }, [userLocation])

  // Update gas station markers when gasStations array changes
  useEffect(() => {
    if (!googleMapRef.current || !gasStations) return

    const map = googleMapRef.current

    // Clear existing gas station markers (keep user marker)
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Add gas station markers
    gasStations.forEach((station) => {
      const marker = new google.maps.Marker({
        position: { lat: station.latitude, lng: station.longitude },
        map,
        title: station.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#FF9500" stroke="#fff" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">⛽</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
        },
      })

      marker.addListener("click", () => {
        // Directly open the drawer
        onStationSelect(station)
      })

      markersRef.current.push(marker)
    })
  }, [gasStations, onStationSelect]) // Separate effect for gas station updates

  if (!userLocation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="h-full w-full" />

      {/* Loading overlay when fetching new stations */}
      {isLoadingStations && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Finding nearby gas stations...</span>
          </div>
        </div>
      )}
    </div>
  )
}
