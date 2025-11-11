"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Camera, Check, Loader2 } from "lucide-react"
import { FuelType } from "@/types"
import { calculateDistance } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PriceEntryFormProps {
  stationId: string
  stationName: string
  stationLat: number
  stationLng: number
  userLocation: { latitude: number; longitude: number } | null
  onSuccess: () => void
  onError: (error: string) => void
}

type Step = 1 | 2 | 3 | 4

export function PriceEntryForm({
  stationId,
  stationName,
  stationLat,
  stationLng,
  userLocation: initialUserLocation,
  onSuccess,
  onError,
}: PriceEntryFormProps) {
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>(1)
  const [fuelType, setFuelType] = useState<FuelType | null>(null)
  const [price, setPrice] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState(initialUserLocation)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get user location if not provided
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setError("Please enable location services to submit prices")
        }
      )
    }
  }, [userLocation])

  const fuelTypes: FuelType[] = ["Regular", "Premium", "Diesel"]

  const handleFuelTypeSelect = (type: FuelType) => {
    setFuelType(type)
    setStep(2)
  }

  const handlePriceSubmit = () => {
    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price")
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
      setError("Location not available. Please enable location services.")
      onError("Location not available")
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
      const errorMsg = `You must be within 500m of the gas station. Current distance: ${Math.round(distance)}m`
      setError(errorMsg)
      onError(errorMsg)
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

      // Success!
      onSuccess()
    } catch (err) {
      console.error("Submission error:", err)
      const errorMsg = err instanceof Error ? err.message : "Failed to submit price"
      setError(errorMsg)
      onError(errorMsg)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Step {step} of 4</span>
          <span className="text-xs text-gray-600">{Math.round((step / 4) * 100)}%</span>
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Select Fuel Type */}
      {step === 1 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Select Fuel Type
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Choose the type of fuel you want to report
          </p>
          <div className="space-y-3">
            {fuelTypes.map((type) => (
              <Button
                key={type}
                onClick={() => handleFuelTypeSelect(type)}
                variant="outline"
                size="lg"
                className="w-full justify-start text-lg h-auto py-4"
              >
                <span className="font-semibold">{type}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Enter Price */}
      {step === 2 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Enter Price
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            What's the price per gallon for {fuelType}?
          </p>
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">$</span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-4xl font-bold text-gray-900 bg-transparent focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-sm text-gray-500">Price per gallon</p>
          </div>
          <Button
            onClick={handlePriceSubmit}
            disabled={!price || parseFloat(price) <= 0}
            size="lg"
            className="w-full"
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 3: Take Photo */}
      {step === 3 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Take a Photo
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Snap a photo of the price sign for verification
          </p>
          <div className="bg-gray-50 rounded-xl p-8 text-center mb-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Open Camera
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Photo is optional but helps verify accuracy
            </p>
          </div>
          <Button
            onClick={() => setStep(4)}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Skip Photo
          </Button>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Review & Submit
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Please confirm your submission details
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div>
              <p className="text-xs text-gray-600">Fuel Type</p>
              <p className="font-semibold text-gray-900">{fuelType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Price</p>
              <p className="text-2xl font-bold text-primary">${price}</p>
            </div>
            {photoPreview && (
              <div>
                <p className="text-xs text-gray-600 mb-2">Photo</p>
                <img
                  src={photoPreview}
                  alt="Price photo"
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Submit Price
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
