"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { Locale, locales, defaultLocale, localeNames, localeFlags } from "@/i18n/config"
import enMessages from "@/messages/en.json"
import esARMessages from "@/messages/es-AR.json"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = "valor-language"

const messages = {
  en: enMessages,
  "es-AR": esARMessages,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && locales.includes(stored)) {
        setLocaleState(stored)
      }
      setIsHydrated(true)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale)
      // Reload page to apply new locale
      window.location.reload()
    }
  }

  if (!isHydrated) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        localeNames,
        localeFlags,
      }}
    >
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
