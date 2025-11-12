'use client'

import { ReactNode, useEffect, useState } from 'react'
import i18n, { i18nConfig } from '../../lib/i18n'

interface I18nProviderProps {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize i18n with React integration only on client side
    const initI18n = async () => {
      if (typeof window !== 'undefined' && !isInitialized) {
        const { initReactI18next } = await import('react-i18next')
        const LanguageDetector = (await import('i18next-browser-languagedetector')).default

        await i18n
          .use(LanguageDetector)
          .use(initReactI18next)
          .init(i18nConfig)

        setIsInitialized(true)
        console.log('i18n initialized with language:', i18n.language)
      }
    }

    initI18n()
  }, [isInitialized])

  return <>{children}</>
}
