"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { X, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GasStation } from "@/types"
import { formatDistance } from "@/lib/utils"

interface PriceSubmissionDrawerProps {
  isOpen: boolean
  station: GasStation | null
  userLocation: { latitude: number; longitude: number } | null
  onClose: () => void
  onSuccess: () => void
  onOpenSubmitPage?: (station: GasStation) => void
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
  onOpenSubmitPage,
}: PriceSubmissionDrawerProps) {
  const t = useTranslations()
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
    if (!station) return
    // Open submit page overlay without closing drawer first
    // The overlay will be on top, and drawer will stay in background
    if (onOpenSubmitPage) {
      onOpenSubmitPage(station)
      // Don't close drawer - let overlay handle visibility
    }
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
          className="bg-white shadow-lg transition-transform duration-500 ease-out overflow-hidden"
          style={{
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            boxShadow: 'var(--shadow-lg)',
            transform: drawerState !== "closed" ? 'scale(1)' : 'scale(0.95)',
            height: drawerState === "preview" ? "auto" : "auto"
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center" style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)' }}>
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Content */}
          <div style={{ padding: `var(--spacing-md) var(--spacing-xl) var(--spacing-xl)` }}>
            {/* Title with icon */}
            <div className="flex items-center" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-md)' }}>
                <span className="text-2xl">⛽</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#1C1C1E] truncate">
                  {station.name}
                </h2>
                {station.address && (
                  <p className="text-sm text-gray-600 truncate" style={{ marginTop: 'var(--spacing-xs)' }}>{station.address}</p>
                )}
              </div>
            </div>

            {/* Last Known Price */}
            <div className="bg-gray-50 border border-gray-200" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 font-medium">{t('drawer.lastPrice')}</span>
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
                  <p className="text-xs text-gray-500">{t('drawer.noRecentData')}</p>
                )}
                <span className="text-xs text-gray-500">{t('drawer.perGallon')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex" style={{ gap: 'var(--spacing-md)' }}>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                <span className="text-xl">📍</span>
              </a>
              <button
                onClick={handleExpand}
                className="flex-1 bg-[var(--valor-green)] text-white font-semibold text-base hover:opacity-90 active:scale-[0.98] transition-all duration-200"
                style={{ padding: 'var(--spacing-md) var(--spacing-xl)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
              >
                {t('drawer.submitPrice')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
