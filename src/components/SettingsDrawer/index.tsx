"use client"

import { useEffect, useState, useRef } from "react"
import { X } from "lucide-react"

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type DrawerState = "closed" | "open"

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [drawerState, setDrawerState] = useState<DrawerState>("closed")
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDrawerState("open")
      document.body.style.overflow = "hidden"
    } else {
      setDrawerState("closed")
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleClose = () => {
    setDrawerState("closed")
    setTimeout(onClose, 300)
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
    }
    setCurrentY(0)
    setStartY(0)
  }


  const getDrawerHeight = () => {
    if (drawerState === "closed") return "0%"
    return "50%"
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40"
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
          className="h-full overflow-y-auto no-scrollbar safe-area-b-20"
          onTouchMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Settings
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic Settings */}
            <div className="space-y-3">
              <div className="text-center text-gray-500 text-sm py-8">
                Settings panel - more options coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

