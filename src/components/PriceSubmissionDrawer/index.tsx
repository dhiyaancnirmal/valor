"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { X, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GasStation } from "@/types"
import { formatDistance } from "@/lib/utils"
import PriceEntryPageDrawer from "./PriceEntryPageDrawer"

interface PriceSubmissionDrawerProps {
  isOpen: boolean
  station: GasStation | null
  userLocation: { latitude: number; longitude: number } | null
  onClose: () => void
  onSuccess: () => void
}

type DrawerState = "closed" | "preview" | "expanded"

interface LastPrice {
  price: number | null
  fuelType: string | null
  createdAt: string | null
  submittedBy: string | null
}

export function PriceSubmissionDrawer({
  isOpen,
  station,
  userLocation,
  onClose,
  onSuccess,
}: PriceSubmissionDrawerProps) {
  const { t } = useTranslation(['priceSubmission', 'common'])
  const [drawerState, setDrawerState] = useState<DrawerState>("closed")
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const [lastPrice, setLastPrice] = useState<LastPrice | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)

  const fetchLastPrice = async (stationId: string) => {
    setIsLoadingPrice(true)
    try {
      const response = await fetch(`/api/stations/${encodeURIComponent(stationId)}/last-price`)
      const data = await response.json()
      
      if (data.error) {
        console.error('Error fetching last price:', data.error)
        setLastPrice(null)
      } else {
        setLastPrice(data)
      }
    } catch (error) {
      console.error('Error fetching last price:', error)
      setLastPrice(null)
    } finally {
      setIsLoadingPrice(false)
    }
  }

  useEffect(() => {
    console.log("Drawer state change:", { isOpen, station: station?.name })
    if (isOpen && station) {
      setDrawerState("preview")
      document.body.style.overflow = 'hidden'
      // Fetch last price when drawer opens
      fetchLastPrice(station.id)
    } else {
      setDrawerState("closed")
      document.body.style.overflow = 'unset'
      setLastPrice(null)
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, station])

  const handleClose = () => {
    setDrawerState("closed")
    setTimeout(onClose, 300)
  }

  const handleExpand = () => {
    setDrawerState("expanded")
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaY = e.touches[0].clientY - startY
    if (deltaY > 0) {
      setCurrentY(deltaY)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (currentY > 100) {
      handleClose()
    } else if (currentY > 0 && drawerState === "expanded") {
      setDrawerState("preview")
    }
    setCurrentY(0)
    setStartY(0)
  }

  if (!station) return null

  const getDrawerHeight = () => {
    if (drawerState === "closed") return "0%"
    if (drawerState === "preview") return "40%"
    return "95%"
  }

  const getTransform = () => {
    if (isDragging && currentY > 0) {
      return `translateY(${currentY}px)`
    }
    return "translateY(0)"
  }

  // Show full-screen entry page when expanded
  if (drawerState === "expanded") {
    return (
      <PriceEntryPageDrawer
        isOpen={true}
        onClose={() => setDrawerState("preview")}
        station={station}
        userLocation={userLocation}
        onSuccess={() => {
          handleClose()
          // Refresh last price after successful submission
          if (station) {
            fetchLastPrice(station.id)
          }
          onSuccess()
        }}
      />
    )
  }

  return (
    <>
      {/* Backdrop/Scrim */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-500 ease-out"
        style={{
          opacity: drawerState !== "closed" ? 1 : 0,
          pointerEvents: drawerState !== "closed" ? 'auto' : 'none'
        }}
        onClick={handleClose}
      />

      {/* Preview Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-500 ease-out"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: drawerState !== "closed" ? 'translateY(0)' : 'translateY(100%)',
          opacity: drawerState !== "closed" ? 1 : 0
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="bg-white rounded-t-3xl shadow-lg transition-transform duration-500 ease-out overflow-hidden"
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            transform: drawerState !== "closed" ? 'scale(1)' : 'scale(0.95)',
            height: drawerState === "preview" ? "auto" : "auto"
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-500">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Content */}
          <div className="px-6 pt-2 pb-6">
            {/* Title with icon */}
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 bg-[var(--valor-green)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⛽</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-[#1C1C1E] truncate">
                  {station.name}
                </h2>
                {station.address && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{station.address}</p>
                )}
              </div>
            </div>

            {/* Last Known Price */}
            <div className="mb-4 p-4 bg-gradient-to-r from-[var(--valor-green)]/10 to-green-100/50 rounded-xl border border-[var(--valor-green)]/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">{t('common:labels.lastPrice')}</span>
                {isLoadingPrice ? (
                  <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
                ) : lastPrice?.price ? (
                  <span className="text-2xl font-bold text-[var(--valor-green)]">${lastPrice.price.toFixed(2)}</span>
                ) : (
                  <span className="text-2xl font-bold text-[var(--valor-green)]">$—</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                {lastPrice?.price ? (
                  <p className="text-xs text-gray-500">
                    {lastPrice.fuelType} • {new Date(lastPrice.createdAt!).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">{t('common:labels.noRecentData')}</p>
                )}
                <span className="text-xs text-gray-500">/gal</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3 mt-4">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 flex items-center justify-center flex-shrink-0 shadow-sm"
              >
                <span className="text-2xl">📍</span>
              </a>
              <button
                onClick={handleExpand}
                className="flex-1 bg-[var(--valor-green)] text-white font-semibold text-base py-4 px-6 rounded-xl hover:shadow-lg active:scale-98 transition-all duration-200 shadow-md"
              >
                {t('common:buttons.submitPrice')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
