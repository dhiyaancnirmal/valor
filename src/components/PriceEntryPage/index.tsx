"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Camera, Check } from "lucide-react"
import { FuelType } from "@/types"
import { calculateDistance } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PriceEntryPageProps {
  stationId: string
  stationName: string
  stationLat: number
  stationLng: number
}

type Step = 1 | 2 | 3 | 4

export function PriceEntryPage({
  stationId,
  stationName,
  stationLat,
  stationLng,
}: PriceEntryPageProps) {
  const { t } = useTranslation(['priceSubmission', 'common'])
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>(1)
  const [fuelType, setFuelType] = useState<FuelType | null>(null)
  const [price, setPrice] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          setError(t('priceSubmission:validation.enableLocationServices'))
        }
      )
    }
  }, [])

  const fuelTypes: FuelType[] = ["Regular", "Premium", "Diesel"]

  const handleFuelTypeSelect = (type: FuelType) => {
    setFuelType(type)
    setStep(2)
  }

  const handlePriceSubmit = () => {
    if (!price || parseFloat(price) <= 0) {
      setError(t('priceSubmission:validation.enterValidPrice'))
      return
    }
    setError(null)
    setStep(3)
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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
      setError(t('priceSubmission:validation.locationNotAvailable') + '. ' + t('priceSubmission:validation.enableLocationServices'))
      return
    }

    // Check distance (must be within 500m)
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      stationLat,
      stationLng
    )

    if (distance > 500) {
      setError(
        t('priceSubmission:validation.mustBeWithin500m', { distance: Math.round(distance) })
      )
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("user_wallet_address", session?.user?.walletAddress || "")
      formData.append("gas_station_name", stationName)
      formData.append("gas_station_id", stationId)
      formData.append("price", price)
      formData.append("fuel_type", fuelType || "")
      formData.append("user_latitude", userLocation.latitude.toString())
      formData.append("user_longitude", userLocation.longitude.toString())
      formData.append("gas_station_latitude", stationLat.toString())
      formData.append("gas_station_longitude", stationLng.toString())
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
      setError(err instanceof Error ? err.message : t('priceSubmission:validation.failedToSubmitPrice'))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F4F8] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => (step > 1 ? setStep((step - 1) as Step) : router.back())}
            className="text-gray-600 hover:text-gray-900"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#1C1C1E]">{t('common:buttons.submitPriceAction')}</h1>
            <p className="text-sm text-gray-600">{stationName}</p>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">{t('common:labels.step')} {step} {t('common:labels.of')} 4</span>
          <span className="text-xs text-gray-600">{Math.round((step / 4) * 100)}{t('common:labels.percent')}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#7DD756] rounded-full h-2 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        {/* Step 1: Select Fuel Type */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceSubmission:steps.selectFuelType')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceSubmission:steps.chooseFuelType')}
            </p>
            <div className="space-y-3">
              {fuelTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleFuelTypeSelect(type)}
                  className="w-full bg-white border-2 border-gray-200 hover:border-primary hover:bg-primary/5 rounded-xl p-4 text-left transition-all"
                >
                  <p className="font-semibold text-gray-900">{type}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Price */}
        {step === 2 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceSubmission:steps.enterPrice')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceSubmission:steps.priceForFuelType', { fuelType: fuelType })}
            </p>
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-4xl font-bold text-gray-900">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 text-4xl font-bold text-gray-900 focus:outline-none"
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500">Price per gallon</p>
            </div>
            <button
              onClick={handlePriceSubmit}
              disabled={!price || parseFloat(price) <= 0}
              className="w-full bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Take Photo */}
        {step === 3 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceSubmission:steps.takePhoto')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceSubmission:steps.photoOfPriceSign')}
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
                {t('common:buttons.openCamera')}
              </button>
              <p className="text-xs text-gray-500 mt-4">
                {t('priceSubmission:photo.photoOptional')}
              </p>
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-300 transition-colors"
            >
              {t('common:buttons.skip')}
            </button>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">
              {t('priceSubmission:steps.reviewSubmit')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('priceSubmission:steps.confirmDetails')}
            </p>
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">{t('priceSubmission:form.gasStation')}</p>
                <p className="font-semibold text-gray-900">{stationName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('priceSubmission:form.fuelType')}</p>
                <p className="font-semibold text-gray-900">{fuelType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('priceSubmission:form.price')}</p>
                <p className="text-2xl font-bold text-[#7DD756]">${price}</p>
              </div>
              {photoPreview && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{t('common:labels.photo')}</p>
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
                  <span>{t('common:buttons.submitting')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{t('common:buttons.submitPrice')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
