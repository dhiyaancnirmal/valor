"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Camera, Check } from "lucide-react"
import { FuelType, GasStation } from "@/types"
import { calculateDistance } from "@/lib/utils"

interface PriceEntryPageProps {
  station: GasStation
}

type Step = 1 | 2 | 3 | 4

export function PriceEntryPage({
  station,
}: PriceEntryPageProps) {
  const t = useTranslations()
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>(1)
  const [fuelType, setFuelType] = useState<FuelType | null>(null)
  const [price, setPrice] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<"USD" | "ARS" | "EUR" | "GBP">("USD")
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [submittedFuelTypes, setSubmittedFuelTypes] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  // Calculate font size based on number of digits
  const getFontSize = (value: string) => {
    const digitCount = value.replace(/[^0-9]/g, '').length
    if (digitCount <= 3) return '2.5rem' // 40px
    if (digitCount <= 4) return '2rem' // 32px
    if (digitCount <= 5) return '1.75rem' // 28px
    if (digitCount <= 6) return '1.5rem' // 24px
    return '1.25rem' // 20px
  }

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setError(t('priceEntry.errors.enableLocation'))
        }
      )
    }
  }, [])

  // Fetch user's submitted fuel types for this station
  useEffect(() => {
    if (session?.user?.walletAddress && station.id) {
      fetch('/api/user-station-submissions')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.stationSubmissions[station.id]) {
            setSubmittedFuelTypes(data.stationSubmissions[station.id])
          }
        })
        .catch(error => {
          console.error('Error fetching user submissions:', error)
        })
    }
  }, [session?.user?.walletAddress, station.id])

  // Set cursor to end when input is focused or when step changes to 2
  useEffect(() => {
    if (step === 2 && priceInputRef.current) {
      const input = priceInputRef.current
      const setCursorToEnd = () => {
        setTimeout(() => {
          if (input) {
            input.setSelectionRange(input.value.length, input.value.length)
          }
        }, 0)
      }
      // Set cursor position immediately when step changes
      setCursorToEnd()
      // Also set it on focus
      input.addEventListener('focus', setCursorToEnd)
      return () => {
        input.removeEventListener('focus', setCursorToEnd)
      }
    }
  }, [step, price])

  const fuelTypes: FuelType[] = ["Regular", "Premium", "Diesel"]

  const handleFuelTypeSelect = (type: FuelType) => {
    setFuelType(type)
    setStep(2)
  }

  const handlePriceSubmit = () => {
    if (!price || parseFloat(price) <= 0) {
      setError(t('priceEntry.errors.validPrice'))
      return
    }
    setError(null)
    setStep(3)
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate that the photo was just taken (not from gallery)
      // Photos taken from camera should have been modified very recently (within last 5 seconds)
      const now = Date.now()
      const fileTime = file.lastModified
      const timeDiff = now - fileTime
      
      // If file is older than 5 seconds, it was likely selected from gallery
      if (timeDiff > 5000) {
        alert("Please take a new photo using the camera. Gallery photos are not allowed.")
        // Reset the input
        e.target.value = ''
        return
      }
      
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setStep(4)
    }
  }

  const handleSubmit = async () => {
    if (!userLocation) {
      setError(t('priceEntry.errors.enableLocation'))
      return
    }

    // Check distance (must be within 500m)
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      station.latitude,
      station.longitude
    )

    if (distance > 500) {
      setError(
        t('priceEntry.errors.distanceError', { distance: Math.round(distance) })
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("user_wallet_address", session?.user?.walletAddress || "")
      formData.append("gas_station_name", station.name)
      formData.append("gas_station_id", station.id)
      formData.append("gas_station_address", station.address || "")
      formData.append("price", price)
      formData.append("fuel_type", fuelType || "")
      formData.append("currency", currency)
      formData.append("user_latitude", userLocation.latitude.toString())
      formData.append("user_longitude", userLocation.longitude.toString())
      formData.append("gas_station_latitude", station.latitude.toString())
      formData.append("gas_station_longitude", station.longitude.toString())
      // POI fields from Google Places API
      if (station.placeId) {
        formData.append("poi_place_id", station.placeId)
      }
      if (station.name) {
        formData.append("poi_name", station.name)
      }
      formData.append("poi_lat", station.latitude.toString())
      formData.append("poi_long", station.longitude.toString())
      if (station.types && station.types.length > 0) {
        formData.append("poi_types", JSON.stringify(station.types))
      }
      if (photo) {
        formData.append("photo", photo)
      }

      const response = await fetch("/api/submit-price", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to submit price")
      }

      // Success! Redirect back to home
      router.push("/?success=true")
    } catch (err) {
      console.error("Submission error:", err)
      setError(err instanceof Error ? err.message : t('priceEntry.errors.submitFailed'))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
            className="text-gray-600 hover:text-gray-900"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#1C1C1E]">{t('priceEntry.submitPrice')}</h1>
            <p className="text-sm text-gray-600">{station.name}</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">{t('priceEntry.step')} {step} {t('priceEntry.of')} 4</span>
          <span className="text-xs text-gray-600">{Math.round((step / 4) * 100)}{t('common.percent')}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        {/* Step 1: Select Fuel Type */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceEntry.selectFuelType')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceEntry.chooseFuelType')}
            </p>
            <div className="space-y-3">
              {fuelTypes.map((type) => {
                const isSubmitted = submittedFuelTypes.includes(type)
                return (
                  <button
                    key={type}
                    onClick={() => !isSubmitted && handleFuelTypeSelect(type)}
                    disabled={isSubmitted}
                    className={`w-full bg-white border-2 rounded-xl p-4 text-left transition-all ${
                      isSubmitted
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100'
                        : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {type}
                      {isSubmitted && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Enter Price */}
        {step === 2 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceEntry.enterPrice')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceEntry.pricePerGallon', { fuelType: fuelType || '' })}
            </p>
            {/* Currency selector */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-gray-50 rounded-lg px-2 py-1 border border-gray-200 gap-3">
                {(["USD", "ARS", "EUR", "GBP"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      currency === c ? "bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                    }`}
                    type="button"
                  >
                    {c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : "$"}
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4 overflow-hidden">
                <span className="text-4xl font-bold text-gray-900">
                  {currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"}
                </span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value)
                    // Keep cursor at end after change
                    setTimeout(() => {
                      if (priceInputRef.current) {
                        const input = priceInputRef.current
                        input.setSelectionRange(input.value.length, input.value.length)
                      }
                    }, 0)
                  }}
                  placeholder="0.00"
                  className="flex-1 font-bold text-gray-900 focus:outline-none text-right overflow-hidden"
                  style={{ 
                    fontSize: getFontSize(price),
                    minWidth: 0
                  }}
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500">{t('ui.pricePerGallon')}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('common.back')}</span>
              </button>
              <button
                onClick={handlePriceSubmit}
                disabled={!price || parseFloat(price) <= 0}
                className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Take Photo */}
        {step === 3 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceEntry.takePhoto')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceEntry.photoDescription')}
            </p>
            <div className="bg-white rounded-xl p-8 text-center mb-6">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-12 h-12 text-primary" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-dark transition-colors"
              >
                {t('priceEntry.openCamera')}
              </button>
              <p className="text-xs text-gray-500 mt-4">
                {t('priceEntry.photoOptional')}
              </p>
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-300 transition-colors"
            >
              {t('common.skip')}
            </button>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceEntry.reviewSubmit')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceEntry.confirmDetails')}
            </p>
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">{t('priceEntry.gasStation')}</p>
                <p className="font-semibold text-gray-900">{station.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('priceEntry.fuelType')}</p>
                <p className="font-semibold text-gray-900">{fuelType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('priceEntry.price')}</p>
                <p className="text-2xl font-bold text-[#7DD756]">
                  {currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"}{price}
                </p>
              </div>
              {photoPreview && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t('priceEntry.photo')}</p>
                  <img
                    src={photoPreview}
                    alt="Price photo"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t('priceEntry.submitting')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{t('priceEntry.submitPrice')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
