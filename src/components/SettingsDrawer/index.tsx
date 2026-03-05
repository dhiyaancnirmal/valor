"use client"

import { useEffect, useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { Globe, Check, Ruler } from "lucide-react"
import { useLanguage } from "@/components/providers/LanguageProvider"

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  units?: 'metric' | 'imperial'
  setUnits?: (units: 'metric' | 'imperial') => void
}

export function SettingsDrawer({ isOpen, onClose, units = 'metric', setUnits }: SettingsDrawerProps) {
  const t = useTranslations()
  const { locale, setLocale, localeNames, localeFlags } = useLanguage()
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  const languages = [
    { code: 'en' as const, name: localeNames['en'], flag: localeFlags['en'] },
    { code: 'es-AR' as const, name: localeNames['es-AR'], flag: localeFlags['es-AR'] }
  ]

  const unitSystems = [
    { code: 'metric' as const, name: 'Metric', icon: '📏', description: 'Kilometers, Liters' },
    { code: 'imperial' as const, name: 'Imperial', icon: '🇺🇸', description: 'Miles, Gallons' }
  ]

  const changeLanguage = (langCode: 'en' | 'es-AR') => {
    setLocale(langCode)
    onClose()
  }

  const changeUnits = (unitCode: 'metric' | 'imperial') => {
    setUnits?.(unitCode)
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

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
      onClose()
    }
    setCurrentY(0)
    setStartY(0)
  }

  return (
    <>
      {/* Backdrop/Scrim */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-250 ease-out"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-250 ease-out"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          opacity: isOpen ? 1 : 0
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="bg-white shadow-lg transition-transform duration-250 ease-out overflow-hidden"
          style={{
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            boxShadow: 'var(--shadow-lg)',
            transform: isOpen ? `translateY(${isDragging ? currentY : 0}px)` : 'scale(0.95)'
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center" style={{ paddingTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)' }}>
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
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
                <Globe className="w-6 h-6 text-[#1C1C1E]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#1C1C1E]">
                  {t('settings.title')}
                </h2>
                <p className="text-sm text-gray-600" style={{ marginTop: 'var(--spacing-xs)' }}>
                  {t('settings.selectLanguage')}
                </p>
              </div>
            </div>

            {/* Language Settings */}
            <div className="space-y-3" style={{ marginBottom: 'var(--spacing-lg)' }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${
                    locale === lang.code
                      ? 'bg-black text-white border-2 border-black'
                      : 'bg-gray-50 border border-gray-200 text-[#1C1C1E] hover:bg-gray-100 hover:border-gray-300'
                  }`}
                  style={{ borderRadius: 'var(--radius-md)' }}
                >
                  <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-base font-semibold">
                      {lang.name}
                    </span>
                  </div>
                  {locale === lang.code && (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Units Section */}
            <div>
              <div className="flex items-center" style={{ gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="w-12 h-12 bg-gray-100 flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-md)' }}>
                  <Ruler className="w-6 h-6 text-[#1C1C1E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-[#1C1C1E]">
                    Units
                  </h3>
                  <p className="text-sm text-gray-600" style={{ marginTop: 'var(--spacing-xs)' }}>
                    Choose your measurement system
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {unitSystems.map((unit) => (
                  <button
                    key={unit.code}
                    onClick={() => changeUnits(unit.code)}
                    className={`w-full flex items-center justify-between p-4 transition-all duration-200 ${
                      units === unit.code
                        ? 'bg-black text-white border-2 border-black'
                        : 'bg-gray-50 border border-gray-200 text-[#1C1C1E] hover:bg-gray-100 hover:border-gray-300'
                    }`}
                    style={{ borderRadius: 'var(--radius-md)' }}
                  >
                    <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
                      <span className="text-2xl">{unit.icon}</span>
                      <div className="text-left">
                        <span className="text-base font-semibold block">
                          {unit.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {unit.description}
                        </span>
                      </div>
                    </div>
                    {units === unit.code && (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
