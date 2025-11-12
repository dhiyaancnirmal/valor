"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslation } from "react-i18next"
import { X, Globe } from "lucide-react"

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type DrawerState = "closed" | "open"

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { t, i18n } = useTranslation(['settings'])
  const [drawerState, setDrawerState] = useState<DrawerState>("closed")
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const currentLanguage = i18n.language || 'es'
  const languages = [
    { code: 'es', name: 'Español', flag: '🇦🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode)
  }

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
                {t('settings:title')}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Globe className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Idioma / Language</p>
                  <p className="text-xs text-gray-600">Selecciona tu idioma / Select your language</p>
                </div>
              </div>

              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      currentLanguage === lang.code
                        ? 'border-[#7DD756] bg-[#7DD756]/5'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                    </div>
                    {currentLanguage === lang.code && (
                      <div className="w-2 h-2 bg-[#7DD756] rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-center text-gray-500 text-sm py-4 border-t border-gray-200">
                {t('settings:placeholder')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

