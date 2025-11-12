"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useParams } from "next/navigation"

/**
 * Client-side component that detects if user is in Argentina
 * and redirects to Spanish locale if needed
 */
export function ArgentinaLocaleDetector() {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const currentLocale = params?.locale as string

  useEffect(() => {
    // Only run once and only if not already on Spanish locale
    if (currentLocale === 'es-AR') {
      return
    }

    // Check if we've already detected (to avoid multiple redirects)
    const hasChecked = sessionStorage.getItem('argentina-locale-checked')
    if (hasChecked) {
      return
    }

    // Mark as checked immediately to prevent multiple checks
    sessionStorage.setItem('argentina-locale-checked', 'true')

    // Get user location and check if they're in Argentina
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            
            // Use reverse geocoding to get country
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            )
            const data = await response.json()
            const countryCode = data.address?.country_code?.toUpperCase()

            // If user is in Argentina, redirect to Spanish locale
            if (countryCode === 'AR' && currentLocale !== 'es-AR') {
              // Replace current locale with es-AR in the pathname
              let newPath = pathname
              
              // Remove current locale prefix if it exists
              if (pathname.startsWith(`/${currentLocale}/`)) {
                newPath = pathname.replace(`/${currentLocale}/`, '/')
              } else if (pathname === `/${currentLocale}`) {
                newPath = '/'
              } else if (pathname.startsWith(`/${currentLocale}`)) {
                newPath = pathname.replace(`/${currentLocale}`, '')
              }
              
              // Add Spanish locale prefix
              if (newPath === '/') {
                newPath = '/es-AR'
              } else {
                newPath = `/es-AR${newPath}`
              }
              
              router.push(newPath)
            }
          } catch (error) {
            console.error('Error detecting country:', error)
            // Clear the check flag on error so it can retry
            sessionStorage.removeItem('argentina-locale-checked')
          }
        },
        (error) => {
          console.error('Error getting location:', error)
          // Clear the check flag on error so it can retry
          sessionStorage.removeItem('argentina-locale-checked')
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      )
    }
  }, [currentLocale, pathname, router])

  return null
}

