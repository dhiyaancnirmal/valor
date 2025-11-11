"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Camera, Check, Loader2 } from "lucide-react"
import { FuelType } from "@/types"
import { calculateDistance } from "@/lib/utils"

import { RewardVaultABI } from "@/lib/abi/RewardVault"
import { MiniKit } from "@worldcoin/minikit-js"
import { SendTransactionErrorCodes } from "@worldcoin/minikit-js"

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
  const [currency, setCurrency] = useState<"USD" | "ARS" | "EUR" | "GBP">("USD")
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

  const fuelTypeLabels: Record<FuelType, string> = {
    Regular: "Regular",
    Premium: "Premium",
    Diesel: "Diesel",
  }
  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "ARS", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
  ] as const

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
      setError("Location not available")
      onError("Location not available")
      return
    }

    // TEMP: Removed distance check for testing

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
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          const data = await response.json()
          throw new Error(data.error || "Failed to submit price")
        } else {
          const text = await response.text()
          throw new Error(text || "Failed to submit price")
        }
      }

      const data = await response.json() as {
        success: boolean
        submission: { id: number }
        rewardEligible?: boolean
        rewardSignature?: string | null
        rewardDeadline?: number | null
        stationIdBytes32?: `0x${string}` | null
        rewardContract?: `0x${string}` | null
      }

      if (data?.rewardEligible && data.rewardSignature && data.rewardDeadline && data.stationIdBytes32) {
        // Trigger claim via MiniKit
        const contractAddress =
          data.rewardContract ||
          (process.env.NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined)
        if (!contractAddress) {
          throw new Error("Reward contract not configured")
        }

        // stationId hashed on backend; contract checks the signature, not the stationId string
        const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: contractAddress,
              abi: RewardVaultABI as any,
              functionName: "claimReward",
              args: [
                (session?.user?.walletAddress || "") as `0x${string}`,
                data.stationIdBytes32,
                BigInt(data.submission.id),
                BigInt(data.rewardDeadline),
                data.rewardSignature as `0x${string}`,
              ],
            },
          ],
        })

        if (finalPayload.status === "success") {
          // Confirm on backend
          await fetch("/api/confirm-reward", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submissionId: data.submission.id,
              transactionId: finalPayload.transaction_id,
            }),
          })
        } else if (finalPayload.status === "error") {
          // Map MiniKit simulation error to user-friendly message
          const simulationError: string | undefined = (finalPayload as any)?.details?.simulationError
          const errorCode: string | undefined = (finalPayload as any)?.error_code
          let friendly = "Failed to submit price"
          if (simulationError?.includes("ERC20: transfer amount exceeds balance")) {
            friendly = "Insufficient funds"
          } else if (errorCode === "simulation_failed" && simulationError) {
            friendly = "Transaction simulation failed"
          }
          throw new Error(friendly)
        }
      }

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
    <div className="space-y-3">
      {/* Progress Bar + Step badges */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-600">Step {step} of 4</span>
          <span className="text-xs text-gray-600">{Math.round((step / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
          <div
            className="bg-[#7DD756] rounded-full h-1.5 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s, idx) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s < step
                    ? "bg-[#7DD756] text-white"
                    : s === step
                    ? "bg-[#7DD756] text-white ring-2 ring-[#7DD756]/20"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {idx < 3 && <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${s < step ? "bg-[#7DD756]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Step 1: Select Fuel Type */}
      {step === 1 && (
        <div>
          <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">
            Select Fuel Type
          </h3>
          <p className="text-gray-600 mb-4 text-sm">
            Choose the type of fuel you're pricing
          </p>
          <div className="space-y-2">
            {fuelTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleFuelTypeSelect(type)}
                variant="outline"
                className="w-full justify-start text-sm"
              >
                <span className="font-semibold">{fuelTypeLabels[type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Enter Price */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-bold text-[#1C1C1E] mb-1.5">
            Enter Price
          </h3>
          <p className="text-gray-600 mb-3 text-xs">
            Price per gallon for {fuelTypeLabels[fuelType!]}
          </p>
          {/* Currency selector */}
          <div className="flex justify-center mb-3">
            <div className="inline-flex bg-gray-50 rounded-lg px-2 py-1 border border-gray-200 gap-3">
              {currencies.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    currency === c.code ? "bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  <span className="mr-1">{c.symbol}</span>
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#FF6B35]/5 via-[#F7931E]/5 to-[#FFD23F]/5 rounded-xl p-5 border border-[#FF6B35]/20 mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-4xl font-bold text-gray-300">
                {currencies.find(c => c.code === currency)?.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-32 text-5xl font-bold text-[#1C1C1E] bg-transparent focus:outline-none text-center border-b-2 border-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-600 text-center">per gallon</p>
          </div>
          <button
            onClick={handlePriceSubmit}
            disabled={!price || parseFloat(price) <= 0}
            className="w-full"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 3: Take Photo */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-bold text-[#1C1C1E] mb-1.5">
            Take Photo
          </h3>
          <p className="text-gray-600 mb-3 text-xs">
            Take a photo of the fuel price sign for verification
          </p>
          <div className="bg-gradient-to-br from-[#7DD756]/5 to-[#7DD756]/10 rounded-xl border border-[#7DD756]/30 p-6 text-center mb-4">
            <div className="w-16 h-16 bg-[#7DD756] rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg">
              <Camera className="w-8 h-8 text-white" />
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
              className="mb-2"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Open Camera
            </button>
            <p className="text-xs text-gray-500 font-medium">
              Photo is optional but recommended
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-900 mb-1.5">Photo Tips</h4>
                <ul className="text-xs text-blue-800 space-y-1 font-medium">
                  <li>• Make sure the price is clearly visible</li>
                  <li>• Include the fuel type if possible</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(4)}
            variant="outline"
            className="w-full"
          >
            Skip Photo
          </button>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div>
          <h3 className="text-lg font-bold text-[#1C1C1E] mb-1.5">
            Review & Submit
          </h3>
          <p className="text-gray-600 mb-3 text-xs">
            Please confirm your submission details
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Fuel Type</p>
              <p className="font-semibold text-gray-900 text-sm">{fuelTypeLabels[fuelType!]}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Price</p>
              <p className="text-xl font-bold text-[#7DD756]">
                {currencies.find(c => c.code === currency)?.symbol}{price}
              </p>
            </div>
            {photoPreview && (
              <div>
                <p className="text-xs text-gray-600 mb-1.5">Photo</p>
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
            variant="secondary"
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Submit Price
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
