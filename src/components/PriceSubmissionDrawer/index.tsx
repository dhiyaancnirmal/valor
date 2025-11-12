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

  useEffect(() => {
    console.log("Drawer state change:", { isOpen, station: station?.name })
    if (isOpen && station) {
      setDrawerState("preview")
      document.body.style.overflow = 'hidden'
    } else {
      setDrawerState("closed")
      document.body.style.overflow = 'unset'
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
          onSuccess()
        }}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      {drawerState !== "closed" && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40"
          onClick={handleClose}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        />
      )}

      {/* Preview Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-50 overflow-hidden"
        style={{
          height: getDrawerHeight(),
          transform: getTransform(),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-2 cursor-pointer">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div
          className="h-full overflow-y-auto no-scrollbar safe-area-b-20"
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {drawerState === "preview" ? (
            // Preview State: Station Info Only
            <div className="px-5 py-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 flex gap-3">
                  {/* Emoji/Icon tile */}
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <span className="text-xl">⛽</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-[#1C1C1E] mb-1">
                      {station.name}
                    </h2>
                    <p className="text-xs text-gray-600 mb-1.5 truncate">{station.address}</p>
                    {station.distance !== undefined && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Navigation className="w-3 h-3 mr-1" />
                        <span>{formatDistance(station.distance, t)} {t('common:labels.away')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Last known price placeholder */}
              <div className="mb-4 p-4 bg-gradient-to-br from-[#7DD756]/5 via-[#7DD756]/10 to-[#7DD756]/5 rounded-lg border border-[#7DD756]/30">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-gray-600 font-medium">{t('common:labels.lastPrice')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#7DD756]">$—</span>
                    <span className="text-xs text-gray-500">/gal</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{t('common:labels.noRecentData')}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 shadow-sm"
                  aria-label="Open in Google Maps"
                >
                  <span className="text-lg">📍</span>
                </a>
                <button
                  onClick={handleExpand}
                  className="flex-1 bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white font-semibold text-sm py-3 px-5 rounded-lg hover:shadow-lg active:scale-[0.99] transition-all duration-200 shadow-md"
                >
                  {t('common:buttons.submitPrice')}
                </button>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-2 transition-colors hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            // Expanded State: Price Entry Form
            <div className="px-5 py-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDrawerState("preview")}
                    className="text-gray-600 hover:text-gray-900 p-1 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1C1E]">
                      {t('common:buttons.submitPriceAction')}
                    </h3>
                    <p className="text-xs text-gray-600">{station.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            {/* Last known price card */}
            <div className="mb-6 p-5 bg-gradient-to-br from-[#7DD756]/5 via-[#7DD756]/10 to-[#7DD756]/5 rounded-2xl border-2 border-[#7DD756]/30 shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-gray-600 font-semibold">{t("drawer.lastPrice")}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-[#7DD756]">$—</span>
                  <span className="text-sm text-gray-500">{t("drawer.perGallon")}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">{t("drawer.noRecentData")}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 shadow-sm"
                aria-label={t("drawer.openInGoogleMaps")}
              >
                <span className="text-2xl">📍</span>
              </a>
              <button
                onClick={handleExpand}
                className="flex-1 bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white font-bold text-base py-4 px-6 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200 shadow-md"
              >
                {t("drawer.submitPrice")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
