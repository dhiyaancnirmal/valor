"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { X, Globe, Check } from "lucide-react"
import { useLanguage } from "@/components/providers/LanguageProvider"

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type DrawerState = "closed" | "open"

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const t = useTranslations()
  const { locale, setLocale, localeNames, localeFlags } = useLanguage()
  const [drawerState, setDrawerState] = useState<DrawerState>("closed")
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const languages = [
    { code: 'en' as const, name: localeNames['en'], flag: localeFlags['en'] },
    { code: 'es-AR' as const, name: localeNames['es-AR'], flag: localeFlags['es-AR'] }
  ]

  const changeLanguage = (langCode: 'en' | 'es-AR') => {
    setLocale(langCode)
    handleClose()
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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ease-out z-[100]"
          style={{
            opacity: drawerState === "open" ? 1 : 0,
            pointerEvents: drawerState === "open" ? 'auto' : 'none'
          }}
          onClick={handleClose}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-[110] transform transition-all duration-500 ease-out"
        style={{
          transform: drawerState === "open" ? 'translateY(0)' : 'translateY(100%)',
          opacity: drawerState === "open" ? 1 : 0
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="bg-white rounded-t-3xl shadow-lg transition-transform duration-500 ease-out"
          style={{
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
            transform: drawerState === "open" ? 'scale(1)' : 'scale(0.95)',
            marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)'
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          {/* Content */}
          <div className="px-6 pt-2 pb-6">
            {/* Title with icon */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-[#7DD756]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-[#7DD756]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-[#1C1C1E]">
                  {t('settings.title')}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('settings.selectLanguage')}
                </p>
              </div>
            </div>

            {/* Language Settings */}
            <div className="space-y-3 mb-4">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                    locale === lang.code
                      ? 'border-[#7DD756] bg-[#7DD756]/5 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{lang.flag}</span>
                    <span className={`text-base font-semibold ${
                      locale === lang.code ? 'text-[#7DD756]' : 'text-gray-900'
                    }`}>
                      {lang.name}
                    </span>
                  </div>
                  {locale === lang.code && (
                    <div className="w-6 h-6 bg-[#7DD756] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="text-center text-gray-400 text-xs py-3 border-t border-gray-100">
              More settings coming soon...
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

