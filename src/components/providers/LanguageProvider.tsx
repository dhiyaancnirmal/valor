"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Locale, locales, defaultLocale, localeNames, localeFlags } from "@/i18n/config"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = "valor-language"

export function LanguageProvider({ children, locale }: { children: ReactNode; locale: string }) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale as Locale)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setCurrentLocale(locale as Locale)
  }, [locale])

  const setLocale = (newLocale: Locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale)
      // Set a cookie to indicate manual language selection (for middleware)
      document.cookie = `valor-language-manual=${newLocale}; path=/; max-age=31536000` // 1 year
    }
    
    // Navigate to the new locale
    // Handle pathname with or without locale prefix
    let newPath = pathname
    
    // Remove current locale from pathname if it exists
    if (pathname.startsWith(`/${currentLocale}/`)) {
      newPath = pathname.replace(`/${currentLocale}/`, '/')
    } else if (pathname === `/${currentLocale}`) {
      newPath = '/'
    } else if (pathname.startsWith(`/${currentLocale}`)) {
      newPath = pathname.replace(`/${currentLocale}`, '')
    }
    
    // Add new locale prefix
    if (newPath === '/') {
      newPath = `/${newLocale}`
    } else {
      newPath = `/${newLocale}${newPath}`
    }
    
    router.push(newPath)
  }

  return (
    <LanguageContext.Provider
      value={{
        locale: currentLocale,
        setLocale,
        localeNames,
        localeFlags,
      }}
    >
      {children}
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
