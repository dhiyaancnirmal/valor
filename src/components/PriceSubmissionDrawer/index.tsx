"use client"

import { useEffect, useState, useRef } from "react"
import { X, Navigation } from "lucide-react"
import { GasStation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { PriceEntryForm } from "./PriceEntryForm"

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
    if (drawerState === "preview") return "35%"
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
      {/* Backdrop */}
      {drawerState !== "closed" && (
        <div
          className="fixed inset-0 bg-black opacity-40 transition-opacity duration-300 z-40"
          onClick={handleClose}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        />
      )}

      {/* Drawer */}
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
        <div className="flex justify-center py-3 cursor-pointer">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div
          className="h-full overflow-y-auto no-scrollbar pb-20"
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {drawerState === "preview" ? (
            // Preview State: Station Info Only
            <div className="px-6 py-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {station.name}
                  </h2>
                  <p className="text-sm text-gray-600 mb-2">{station.address}</p>
                  {station.distance !== undefined && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Navigation className="w-4 h-4 mr-1" />
                      <span>{formatDistance(station.distance)} away</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 p-2 -mt-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={handleExpand}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all text-xl"
                style={{ backgroundColor: '#7DD756' }}
              >
                Submit Price
              </button>
            </div>
          ) : (
            // Expanded State: Price Entry Form
            <div className="px-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setDrawerState("preview")}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <svg
                      className="w-6 h-6"
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
                    <h3 className="text-lg font-semibold text-gray-900">
                      Submit Price
                    </h3>
                    <p className="text-sm text-gray-600">{station.name}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <PriceEntryForm
                stationId={station.id}
                stationName={station.name}
                stationLat={station.latitude}
                stationLng={station.longitude}
                userLocation={userLocation}
                onSuccess={() => {
                  handleClose()
                  onSuccess()
                }}
                onError={(error) => {
                  console.error("Price submission error:", error)
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
