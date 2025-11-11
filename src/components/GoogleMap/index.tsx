"use client"

import { useEffect, useRef, useState } from "react"
import { GasStation, UserLocation } from "@/types"

interface GoogleMapViewProps {
  userLocation: UserLocation | null
  gasStations: GasStation[]
  onStationSelect: (station: GasStation) => void
}

export function GoogleMapView({ userLocation, gasStations, onStationSelect }: GoogleMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    if (!mapRef.current || !window.google || !userLocation) return

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      center: { lat: userLocation.latitude, lng: userLocation.longitude },
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

    // Add user location marker
    new google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map,
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

    // Clear existing markers
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
  }, [userLocation, gasStations])

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
    </div>
  )
}
