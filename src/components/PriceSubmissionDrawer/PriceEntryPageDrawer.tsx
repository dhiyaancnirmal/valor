"use client"

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Camera, Check, ChevronRight, MapPin, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { MobileScreen, StickyActionBar } from "@/components/mobile"
import { WorldIdVerificationSheet } from "@/components/WorldIdVerificationSheet"
import { useWorldIdStatus } from "@/hooks/useWorldIdStatus"
import { calculateDistance, cn } from "@/lib/utils"
import type { GasStation, UserLocation } from "@/types"
import {
  createPendingGroceryProposal,
  getCountryFromLocale,
  getGroceryBaskets,
  getGroceryCatalog,
  getPendingGroceryProposals,
  saveGroceryBasketSubmission,
  saveGroceryItemSubmission,
  type GroceryCategory,
  type GroceryProductDefinition,
  type GroceryProposalDraft,
  type GrocerySubmissionKind,
} from "./grocery-mocks"

interface PriceEntryPageProps {
  station: GasStation
  userLocation: UserLocation | null
  onSuccess?: () => void
  onClose?: () => void
}

type Step = "product" | "price" | "photo" | "review"

type InlineNotice = {
  tone: "error" | "success"
  title: string
  detail?: string
}

const STEPS: Step[] = ["product", "price", "photo", "review"]

export default function PriceEntryPage({ station, userLocation, onSuccess, onClose }: PriceEntryPageProps) {
  const { data: session } = useSession()
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [currentStep, setCurrentStep] = useState<Step>("product")
  const [grocerySubmissionKind, setGrocerySubmissionKind] = useState<GrocerySubmissionKind>("item")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [selectedBasketId, setSelectedBasketId] = useState("")
  const [basketPrices, setBasketPrices] = useState<Record<string, string>>({})
  const [price, setPrice] = useState("")
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currency, setCurrency] = useState("USD")
  const [submittedFuelTypes, setSubmittedFuelTypes] = useState<string[]>([])
  const [currentUserLocation, setCurrentUserLocation] = useState<UserLocation | null>(userLocation)
  const [notice, setNotice] = useState<InlineNotice | null>(null)
  const [isWorldIdSheetOpen, setIsWorldIdSheetOpen] = useState(false)
  const [isProposalFormOpen, setIsProposalFormOpen] = useState(false)
  const [proposalName, setProposalName] = useState("")
  const [proposalUnitLabel, setProposalUnitLabel] = useState("")
  const [proposalCategory, setProposalCategory] = useState<GroceryCategory>("pantry")
  const [pendingProposals, setPendingProposals] = useState<GroceryProposalDraft[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const {
    enabled: isWorldIdEnabled,
    verified: isWorldIdVerified,
    action: worldIdAction,
    refresh: refreshWorldIdStatus,
  } = useWorldIdStatus(Boolean(session?.user?.walletAddress))
  const groceryCountry = getCountryFromLocale(locale)
  const isGroceryVenue = station.primaryCategory === "grocery_store" || station.submissionMode === "read_only"
  const groceryCatalog = useMemo(() => getGroceryCatalog(groceryCountry), [groceryCountry])
  const groceryBaskets = useMemo(() => getGroceryBaskets(groceryCountry), [groceryCountry])

  const gasProducts = useMemo(
    () => [
      { id: "Regular", label: t("priceEntry.fuelTypes.regular"), icon: "⛽", description: t("priceEntry.fuelTypes.regularDesc") },
      { id: "Premium", label: t("priceEntry.fuelTypes.premium"), icon: "⛽", description: t("priceEntry.fuelTypes.premiumDesc") },
      { id: "Diesel", label: t("priceEntry.fuelTypes.diesel"), icon: "⛽", description: t("priceEntry.fuelTypes.dieselDesc") },
    ],
    [t]
  )

  const groceryCategories = useMemo(
    () => [
      { id: "dairy" as GroceryCategory, label: t("priceEntry.grocery.categories.dairy") },
      { id: "produce" as GroceryCategory, label: t("priceEntry.grocery.categories.produce") },
      { id: "pantry" as GroceryCategory, label: t("priceEntry.grocery.categories.pantry") },
      { id: "bakery" as GroceryCategory, label: t("priceEntry.grocery.categories.bakery") },
      { id: "beverages" as GroceryCategory, label: t("priceEntry.grocery.categories.beverages") },
    ],
    [t]
  )

  const currencies = useMemo(
    () => [
      { code: "USD", symbol: "$", name: t("currencyInfo.USD.name") },
      { code: "EUR", symbol: "€", name: t("currencyInfo.EUR.name") },
      { code: "GBP", symbol: "£", name: t("currencyInfo.GBP.name") },
      { code: "JPY", symbol: "¥", name: t("currencyInfo.JPY.name") },
      { code: "CNY", symbol: "¥", name: t("currencyInfo.CNY.name") },
      { code: "AUD", symbol: "$", name: t("currencyInfo.AUD.name") },
      { code: "CAD", symbol: "$", name: t("currencyInfo.CAD.name") },
      { code: "CHF", symbol: "Fr", name: t("currencyInfo.CHF.name") },
      { code: "INR", symbol: "₹", name: t("currencyInfo.INR.name") },
      { code: "MXN", symbol: "$", name: t("currencyInfo.MXN.name") },
      { code: "BRL", symbol: "R$", name: t("currencyInfo.BRL.name") },
      { code: "ARS", symbol: "$", name: t("currencyInfo.ARS.name") },
      { code: "KRW", symbol: "₩", name: t("currencyInfo.KRW.name") },
      { code: "SGD", symbol: "$", name: t("currencyInfo.SGD.name") },
      { code: "NZD", symbol: "$", name: t("currencyInfo.NZD.name") },
      { code: "ZAR", symbol: "R", name: t("currencyInfo.ZAR.name") },
      { code: "SEK", symbol: "kr", name: t("currencyInfo.SEK.name") },
      { code: "NOK", symbol: "kr", name: t("currencyInfo.NOK.name") },
      { code: "DKK", symbol: "kr", name: t("currencyInfo.DKK.name") },
      { code: "PLN", symbol: "zł", name: t("currencyInfo.PLN.name") },
    ],
    [t]
  )

  const selectedGroceryProduct = groceryCatalog.find((product) => product.id === selectedProduct) ?? null
  const selectedBasket = groceryBaskets.find((basket) => basket.id === selectedBasketId) ?? null
  const basketEntries = selectedBasket
    ? selectedBasket.items.map((itemId) => ({
        product: groceryCatalog.find((product) => product.id === itemId),
        value: basketPrices[itemId] ?? "",
      }))
    : []
  const basketTotal = basketEntries.reduce((sum, entry) => sum + (Number.parseFloat(entry.value) || 0), 0)
  const canProceedFromProduct = isGroceryVenue
    ? grocerySubmissionKind === "item"
      ? selectedProduct !== ""
      : selectedBasketId !== ""
    : selectedProduct !== ""
  const parsedPrice = Number.parseFloat(price)
  const canProceedFromPrice = isGroceryVenue
    ? grocerySubmissionKind === "item"
      ? price !== "" && Number.isFinite(parsedPrice) && parsedPrice > 0
      : basketEntries.length > 0 && basketEntries.every((entry) => entry.product && Number.parseFloat(entry.value) > 0)
    : price !== "" && Number.isFinite(parsedPrice) && parsedPrice > 0
  const canProceedFromPhoto = capturedPhoto !== null
  const distanceFromStation = currentUserLocation
    ? calculateDistance(
        currentUserLocation.latitude,
        currentUserLocation.longitude,
        station.latitude,
        station.longitude
      )
    : null
  const canSubmit = Boolean(
    canProceedFromProduct &&
      canProceedFromPrice &&
      capturedPhoto &&
      currentUserLocation &&
      distanceFromStation !== null &&
      distanceFromStation <= 500
  )

  useEffect(() => {
    if (userLocation) {
      setCurrentUserLocation(userLocation)
    }
  }, [userLocation])

  useEffect(() => {
    if (!currentUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setNotice({
            tone: "error",
            title: t("priceEntry.errors.locationNotAvailable"),
            detail: t("priceEntry.errors.enableLocation"),
          })
        }
      )
    }
  }, [currentUserLocation, t])

  useEffect(() => {
    if (!isGroceryVenue) return
    setPendingProposals(getPendingGroceryProposals(station.id, groceryCountry))
  }, [groceryCountry, isGroceryVenue, station.id])

  useEffect(() => {
    if (!currentUserLocation) return
    void getCurrencyFromLocation(currentUserLocation.latitude, currentUserLocation.longitude).then((detectedCurrency) => {
      setCurrency(detectedCurrency)
    })
  }, [currentUserLocation])

  useEffect(() => {
    if (!session?.user?.walletAddress || !station.id) return

    const controller = new AbortController()
    fetch("/api/user-station-submissions", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.stationSubmissions[station.id]) {
          setSubmittedFuelTypes(data.stationSubmissions[station.id])
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching user submissions:", error)
        }
      })

    return () => controller.abort()
  }, [session?.user?.walletAddress, station.id])

  useEffect(() => {
    if (currentStep !== "price" || !priceInputRef.current) return

    const input = priceInputRef.current
    const setCursorToEnd = () => {
      window.setTimeout(() => {
        try {
          input.setSelectionRange(input.value.length, input.value.length)
        } catch {
          // Ignore unsupported selection APIs.
        }
      }, 0)
    }

    setCursorToEnd()
    input.addEventListener("focus", setCursorToEnd)
    return () => input.removeEventListener("focus", setCursorToEnd)
  }, [currentStep, price])

  const handleBack = () => {
    if (onClose) {
      onClose()
      return
    }

    const localeMatch = pathname.match(/^\/([^/]+)/)
    const locale = localeMatch ? localeMatch[1] : "en"
    router.push(`/${locale}`)
  }

  const handleNext = () => {
    if (currentStep === "product" && canProceedFromProduct) setCurrentStep("price")
    if (currentStep === "price" && canProceedFromPrice) setCurrentStep("photo")
    if (currentStep === "photo" && canProceedFromPhoto) setCurrentStep("review")
  }

  const handlePrevious = () => {
    if (currentStep === "price") setCurrentStep("product")
    if (currentStep === "photo") setCurrentStep("price")
    if (currentStep === "review") setCurrentStep("photo")
  }

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      event.target.value = ""
      return
    }

    const now = Date.now()
    const timeDiff = now - file.lastModified
    if (timeDiff > 5000) {
      setNotice({
        tone: "error",
        title: t("common.error"),
        detail: t("priceEntry.photoFreshRequired"),
      })
      event.target.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string
      setCapturedPhoto(result)
      setNotice(null)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const handleSubmit = async () => {
    if (isWorldIdEnabled && !isWorldIdVerified) {
      setNotice({
        tone: "error",
        title: t("worldId.verificationRequired"),
        detail: t("worldId.verifyToSubmitDescription"),
      })
      setIsWorldIdSheetOpen(true)
      return
    }

    if (!canSubmit) {
      if (!currentUserLocation) {
        setNotice({
          tone: "error",
          title: t("priceEntry.errors.locationNotAvailable"),
          detail: t("priceEntry.errors.enableLocation"),
        })
      } else if ((distanceFromStation ?? Number.POSITIVE_INFINITY) > 500) {
        setNotice({
          tone: "error",
          title: t("priceEntry.errors.distanceError", { distance: Math.round(distanceFromStation ?? 0) }),
        })
      }
      return
    }

    setIsSubmitting(true)
    setNotice(null)

    try {
      if (isGroceryVenue) {
        if (grocerySubmissionKind === "item" && selectedGroceryProduct) {
          saveGroceryItemSubmission({
            stationId: station.id,
            country: groceryCountry,
            productId: selectedGroceryProduct.id,
            price: Number.parseFloat(price),
            currency,
          })
        }

        if (grocerySubmissionKind === "basket" && selectedBasket) {
          saveGroceryBasketSubmission({
            stationId: station.id,
            country: groceryCountry,
            basketId: selectedBasket.id,
            currency,
            items: basketEntries
              .filter((entry): entry is { product: GroceryProductDefinition; value: string } => Boolean(entry.product))
              .map((entry) => ({
                productId: entry.product.id,
                price: Number.parseFloat(entry.value),
              })),
          })
        }

        setNotice({
          tone: "success",
          title: t("priceEntry.grocery.submissionSuccess"),
          detail: t("priceEntry.submissionPending"),
        })

        resetGroceryFlow(setCurrentStep, setSelectedProduct, setSelectedBasketId, setBasketPrices, setPrice, setCapturedPhoto, setGrocerySubmissionKind)
        await new Promise((resolve) => window.setTimeout(resolve, 1100))
        if (onSuccess) {
          onSuccess()
        } else {
          handleBack()
        }
        return
      }

      let photoFile: File | null = null
      if (capturedPhoto) {
        const photoResponse = await fetch(capturedPhoto)
        const blob = await photoResponse.blob()
        photoFile = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })
      }

      const formData = new FormData()
      formData.append("user_wallet_address", session?.user?.walletAddress || "")
      formData.append("gas_station_name", station.name)
      formData.append("gas_station_id", station.id)
      formData.append("gas_station_address", station.address || "")
      formData.append("price", price)
      formData.append("fuel_type", selectedProduct)
      formData.append("currency", currency)
      formData.append("user_latitude", currentUserLocation!.latitude.toString())
      formData.append("user_longitude", currentUserLocation!.longitude.toString())
      formData.append("gas_station_latitude", station.latitude.toString())
      formData.append("gas_station_longitude", station.longitude.toString())
      if (station.placeId) formData.append("poi_place_id", station.placeId)
      if (station.name) formData.append("poi_name", station.name)
      formData.append("poi_lat", station.latitude.toString())
      formData.append("poi_long", station.longitude.toString())
      if (station.types && station.types.length > 0) {
        formData.append("poi_types", JSON.stringify(station.types))
      }
      if (photoFile) {
        formData.append("photo", photoFile)
      }

      const response = await fetch("/api/submit-price", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        if (result.error === "worldIdVerificationRequired") {
          setNotice({
            tone: "error",
            title: t("worldId.verificationRequired"),
            detail: t("worldId.verifyToSubmitDescription"),
          })
          setIsWorldIdSheetOpen(true)
        }
        throw new Error(result.error || "Submission failed")
      }

      setNotice({
        tone: "success",
        title: t("priceEntry.submissionSuccess"),
        detail: t("priceEntry.submissionPending"),
      })

      setCurrentStep("product")
      setSelectedProduct("")
      setPrice("")
      setCapturedPhoto(null)
      setSubmittedFuelTypes((previous) => (selectedProduct ? Array.from(new Set([...previous, selectedProduct])) : previous))

      await new Promise((resolve) => window.setTimeout(resolve, 1100))
      if (onSuccess) {
        onSuccess()
      } else {
        handleBack()
      }
    } catch (error) {
      console.error("[Submit] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setNotice({
        tone: "error",
        title: t("common.error"),
        detail: t("priceEntry.submissionFailed", { error: errorMessage }),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitProposal = () => {
    const trimmedName = proposalName.trim()
    const trimmedUnit = proposalUnitLabel.trim()
    if (trimmedName.length < 2 || trimmedUnit.length < 1) {
      setNotice({
        tone: "error",
        title: t("common.error"),
        detail: t("priceEntry.grocery.proposalValidation"),
      })
      return
    }

    const proposal = createPendingGroceryProposal({
      stationId: station.id,
      country: groceryCountry,
      name: trimmedName,
      unitLabel: trimmedUnit,
      category: proposalCategory,
    })

    setPendingProposals((previous) => [proposal, ...previous])
    setProposalName("")
    setProposalUnitLabel("")
    setProposalCategory("pantry")
    setIsProposalFormOpen(false)
    setNotice({
      tone: "success",
      title: t("priceEntry.grocery.proposalPending"),
      detail: t("priceEntry.grocery.proposalPendingDetail"),
    })
  }

  return (
    <MobileScreen
      className="bg-[#F4F4F8]"
      header={
        <div className="border-b border-black/5 bg-white/95 shadow-sm backdrop-blur">
          <div className="safe-px-app safe-pt-lg px-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-gray-700 active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="truncate text-lg text-[#1C1C1E]">
                {isGroceryVenue ? t("drawer.submitGroceryPrices") : t("drawer.submitPrice")}
              </h1>
              <div className="h-11 w-11" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {STEPS.map((step, index) => {
                const completed = isStepCompleted(step, canProceedFromProduct, canProceedFromPrice, capturedPhoto)
                const active = currentStep === step
                return (
                  <div key={step} className="flex flex-1 items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs transition-all",
                        completed || active ? "bg-[var(--valor-green)] text-white" : "bg-black/10 text-gray-500"
                      )}
                    >
                      {completed ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < STEPS.length - 1 ? (
                      <div className={cn("h-1 flex-1 rounded-full", completed ? "bg-[var(--valor-green)]" : "bg-black/10")} />
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-black/5 bg-[var(--valor-bg-soft)] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                {isGroceryVenue ? "🛒" : "⛽"}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm text-[#1C1C1E]">{station.name}</p>
                {station.address ? <p className="line-clamp-1 text-xs text-gray-500">{station.address}</p> : null}
              </div>
            </div>
          </div>
        </div>
      }
      footer={
        <StickyActionBar innerClassName="flex gap-3 px-4 pt-3">
          <button
            type="button"
            onClick={currentStep === "product" ? handleBack : handlePrevious}
            className={cn(
              "min-h-12 rounded-2xl border border-black/10 px-4 text-sm text-[#1C1C1E] active:scale-[0.99]",
              currentStep === "product" ? "flex-[0_0_76px]" : "flex-[0_0_108px]"
            )}
          >
            {currentStep === "product" ? t("common.close") : t("common.back")}
          </button>
          {currentStep === "review" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "min-h-12 flex-1 rounded-2xl px-4 text-sm active:scale-[0.99]",
                canSubmit && !isSubmitting ? "bg-[var(--valor-green)] text-white" : "bg-gray-300 text-gray-500"
              )}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("priceEntry.submitting")}
                </span>
              ) : (
                isGroceryVenue ? t("drawer.submitGroceryPrices") : t("drawer.submitPrice")
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (currentStep === "product" && !canProceedFromProduct) ||
                (currentStep === "price" && !canProceedFromPrice) ||
                (currentStep === "photo" && !canProceedFromPhoto)
              }
              className={cn(
                "min-h-12 flex-1 rounded-2xl px-4 text-sm active:scale-[0.99]",
                (currentStep === "product" && canProceedFromProduct) ||
                  (currentStep === "price" && canProceedFromPrice) ||
                  (currentStep === "photo" && canProceedFromPhoto)
                  ? "bg-[var(--valor-green)] text-white"
                  : "bg-gray-300 text-gray-500"
              )}
            >
              <span className="inline-flex items-center gap-2">
                <span>{t("priceEntry.next")}</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          )}
        </StickyActionBar>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="px-4 py-4">
        {notice ? (
          <div
            className={cn(
              "mb-4 rounded-[24px] border px-4 py-3 text-sm",
              notice.tone === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            <p>{notice.title}</p>
            {notice.detail ? <p className="mt-1 text-xs opacity-80">{notice.detail}</p> : null}
          </div>
        ) : null}

        {currentStep === "product" ? (
          <div className="space-y-4">
            {isGroceryVenue ? (
              <>
                <div>
                  <h2 className="text-xl text-[#1C1C1E]">{t("priceEntry.grocery.chooseSubmissionType")}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t("priceEntry.grocery.chooseSubmissionDetail")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGrocerySubmissionKind("item")
                      setSelectedBasketId("")
                    }}
                    className={cn(
                      "rounded-[22px] border px-4 py-4 text-left shadow-sm active:scale-[0.99]",
                      grocerySubmissionKind === "item"
                        ? "border-[var(--valor-green)] bg-[var(--valor-green)]/6"
                        : "border-black/5 bg-white"
                    )}
                  >
                    <p className="text-base text-[#1C1C1E]">{t("priceEntry.grocery.singleItem")}</p>
                    <p className="mt-1 text-sm text-gray-500">{t("priceEntry.grocery.singleItemDetail")}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGrocerySubmissionKind("basket")
                      setSelectedProduct("")
                    }}
                    className={cn(
                      "rounded-[22px] border px-4 py-4 text-left shadow-sm active:scale-[0.99]",
                      grocerySubmissionKind === "basket"
                        ? "border-[var(--valor-green)] bg-[var(--valor-green)]/6"
                        : "border-black/5 bg-white"
                    )}
                  >
                    <p className="text-base text-[#1C1C1E]">{t("priceEntry.grocery.basket")}</p>
                    <p className="mt-1 text-sm text-gray-500">{t("priceEntry.grocery.basketDetail")}</p>
                  </button>
                </div>

                {grocerySubmissionKind === "item" ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg text-[#1C1C1E]">{t("priceEntry.grocery.chooseProduct")}</h3>
                      <p className="mt-1 text-sm text-gray-500">{t("priceEntry.grocery.fixedUnitHint")}</p>
                    </div>

                    <div className="space-y-3">
                      {groceryCatalog.map((product) => {
                        const selected = selectedProduct === product.id
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => setSelectedProduct(product.id)}
                            className={cn(
                              "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]",
                              selected ? "border-[var(--valor-green)] bg-[var(--valor-green)]/5" : "border-black/5 bg-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-2xl", selected ? "bg-[var(--valor-green)] text-white" : "bg-[var(--valor-bg-soft)]")}>🛒</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base text-[#1C1C1E]">{product.name}</p>
                                  <span className="rounded-full bg-black/5 px-2 py-1 text-[11px] text-gray-600">{product.unitLabel}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                                <p className="mt-2 text-xs text-gray-400">
                                  {t("priceEntry.grocery.referencePrice")}: {formatCurrency(product.lastKnownPrice, product.currency)}
                                </p>
                              </div>
                              {selected ? <Check className="h-5 w-5 text-[var(--valor-green)]" /> : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsProposalFormOpen((value) => !value)}
                      className="w-full rounded-[22px] border border-dashed border-black/10 bg-white px-4 py-4 text-left text-sm text-[#1C1C1E] active:scale-[0.99]"
                    >
                      {t("priceEntry.grocery.proposeMissingProduct")}
                    </button>

                    {isProposalFormOpen ? (
                      <div className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
                        <h4 className="text-base text-[#1C1C1E]">{t("priceEntry.grocery.createProposal")}</h4>
                        <div className="mt-3 space-y-3">
                          <input
                            value={proposalName}
                            onChange={(event) => setProposalName(event.target.value)}
                            placeholder={t("priceEntry.grocery.productName")}
                            className="min-h-12 w-full rounded-2xl border border-black/10 px-4 text-sm focus:border-[var(--valor-green)] focus:outline-none"
                          />
                          <input
                            value={proposalUnitLabel}
                            onChange={(event) => setProposalUnitLabel(event.target.value)}
                            placeholder={t("priceEntry.grocery.unitLabel")}
                            className="min-h-12 w-full rounded-2xl border border-black/10 px-4 text-sm focus:border-[var(--valor-green)] focus:outline-none"
                          />
                          <select
                            value={proposalCategory}
                            onChange={(event) => setProposalCategory(event.target.value as GroceryCategory)}
                            className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm focus:border-[var(--valor-green)] focus:outline-none"
                          >
                            {groceryCategories.map((category) => (
                              <option key={category.id} value={category.id}>{category.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleSubmitProposal}
                            className="min-h-12 w-full rounded-2xl bg-[var(--valor-green)] px-4 text-sm text-white active:scale-[0.99]"
                          >
                            {t("priceEntry.grocery.submitProposal")}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {pendingProposals.length > 0 ? (
                      <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                        <p className="text-sm">{t("priceEntry.grocery.pendingProducts")}</p>
                        <div className="mt-3 space-y-2">
                          {pendingProposals.map((proposal) => (
                            <div key={proposal.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 text-xs text-gray-600">
                              <span>{proposal.name} • {proposal.unitLabel}</span>
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] text-amber-700">{t("priceEntry.grocery.pendingBadge")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg text-[#1C1C1E]">{t("priceEntry.grocery.chooseBasket")}</h3>
                      <p className="mt-1 text-sm text-gray-500">{t("priceEntry.grocery.basketHint")}</p>
                    </div>
                    {groceryBaskets.map((basket) => {
                      const selected = selectedBasketId === basket.id
                      const total = basket.items.reduce((sum, itemId) => sum + (groceryCatalog.find((product) => product.id === itemId)?.lastKnownPrice ?? 0), 0)
                      return (
                        <button
                          key={basket.id}
                          type="button"
                          onClick={() => setSelectedBasketId(basket.id)}
                          className={cn(
                            "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm active:scale-[0.99]",
                            selected ? "border-[var(--valor-green)] bg-[var(--valor-green)]/5" : "border-black/5 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base text-[#1C1C1E]">{basket.label}</p>
                              <p className="mt-1 text-sm text-gray-500">{basket.subtitle}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg text-[var(--valor-green)]">{formatCurrency(total, groceryCatalog[0]?.currency ?? currency)}</p>
                              <p className="text-xs text-gray-400">{basket.items.length} {t("drawer.itemCount", { count: basket.items.length })}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl text-[#1C1C1E]">{t("priceEntry.selectFuelType")}</h2>
                  <p className="mt-1 text-sm text-gray-500">{t("priceEntry.chooseFuelType")}</p>
                </div>
                <div className="space-y-3">
                  {gasProducts.map((product) => {
                    const isSubmitted = submittedFuelTypes.includes(product.id)
                    const selected = selectedProduct === product.id
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => !isSubmitted && setSelectedProduct(product.id)}
                        disabled={isSubmitted}
                        className={cn(
                          "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99]",
                          isSubmitted
                            ? "border-black/5 bg-white/60 opacity-60"
                            : selected
                              ? "border-[var(--valor-green)] bg-[var(--valor-green)]/5"
                              : "border-black/5 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-2xl", selected ? "bg-[var(--valor-green)] text-white" : "bg-[var(--valor-bg-soft)]")}>{product.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base text-[#1C1C1E]">{product.label}</p>
                              {isSubmitted ? <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] text-green-700">Submitted</span> : null}
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                          </div>
                          {selected && !isSubmitted ? <Check className="h-5 w-5 text-[var(--valor-green)]" /> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ) : null}

        {currentStep === "price" ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl text-[#1C1C1E]">
                  {isGroceryVenue && grocerySubmissionKind === "basket" ? t("priceEntry.grocery.enterBasketPrices") : t("priceEntry.enterPrice")}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {isGroceryVenue
                    ? grocerySubmissionKind === "item"
                      ? t("priceEntry.grocery.pricePerUnitLabel", { unit: selectedGroceryProduct?.unitLabel ?? "" })
                      : t("priceEntry.grocery.priceEachBasketItem")
                    : t("priceEntry.pricePerGallonLabel")}
                </p>
              </div>
              <div className="relative shrink-0">
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="min-h-11 appearance-none rounded-2xl border border-black/10 bg-white px-3 pr-8 text-sm text-[#1C1C1E] focus:border-[var(--valor-green)] focus:outline-none"
                >
                  {currencies.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.symbol} {option.code}
                    </option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-gray-400" />
              </div>
            </div>

            {isGroceryVenue && grocerySubmissionKind === "basket" && selectedBasket ? (
              <div className="space-y-3">
                <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base text-[#1C1C1E]">{selectedBasket.label}</p>
                      <p className="mt-1 text-sm text-gray-500">{selectedBasket.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl text-[var(--valor-green)]">{formatCurrency(basketTotal, currency)}</p>
                      <p className="mt-1 text-xs text-gray-400">{t("priceEntry.grocery.liveBasketTotal")}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {basketEntries.map((entry) => (
                    <div key={entry.product?.id ?? entry.value} className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base text-[#1C1C1E]">{entry.product?.name}</p>
                          <p className="mt-1 text-sm text-gray-500">{entry.product?.unitLabel}</p>
                        </div>
                        <div className="min-w-[112px]">
                          <input
                            type="text"
                            placeholder="0.00"
                            value={entry.value}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              if (nextValue === "" || /^\d*\.?\d*$/.test(nextValue)) {
                                setBasketPrices((previous) => ({ ...previous, [entry.product?.id ?? ""]: nextValue }))
                                setNotice(null)
                              }
                            }}
                            inputMode="decimal"
                            className="w-full rounded-2xl border border-black/10 bg-[var(--valor-bg)] px-3 py-3 text-right text-base text-[#1C1C1E] outline-none focus:border-[var(--valor-green)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-black/5 bg-white px-5 py-6 shadow-sm">
                {isGroceryVenue && selectedGroceryProduct ? (
                  <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--valor-bg-soft)] px-4 py-3">
                    <div>
                      <p className="text-base text-[#1C1C1E]">{selectedGroceryProduct.name}</p>
                      <p className="mt-1 text-sm text-gray-500">{selectedGroceryProduct.unitLabel}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">{t("priceEntry.grocery.fixedUnit")}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="text-4xl text-gray-300">{currencies.find((option) => option.code === currency)?.symbol}</span>
                  <input
                    ref={priceInputRef}
                    type="text"
                    placeholder="0.00"
                    value={price}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      if (nextValue === "" || /^\d*\.?\d*$/.test(nextValue)) {
                        setPrice(nextValue)
                        setNotice(null)
                      }
                    }}
                    inputMode="decimal"
                    autoFocus
                    className="min-w-0 flex-1 border-b-2 border-black/10 bg-transparent pb-2 text-right text-[#1C1C1E] outline-none focus:border-[var(--valor-green)]"
                    style={{ fontSize: getFontSize(price), lineHeight: 1 }}
                  />
                </div>
                <p className="mt-4 text-center text-sm text-gray-500">{currencies.find((option) => option.code === currency)?.name}</p>
              </div>
            )}
          </div>
        ) : null}

        {currentStep === "photo" ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl text-[#1C1C1E]">{t("priceEntry.takePhoto")}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isGroceryVenue
                  ? grocerySubmissionKind === "item"
                    ? t("priceEntry.grocery.photoDescriptionItem")
                    : t("priceEntry.grocery.photoDescriptionBasket")
                  : t("priceEntry.photoDescription")}
              </p>
            </div>

            {capturedPhoto ? (
              <div className="relative overflow-hidden rounded-[28px] border border-[var(--valor-green)]/25 bg-white shadow-sm">
                <img src={capturedPhoto} alt="Captured price" className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-4 text-sm text-white">
                  {t("priceEntry.photoCaptured")}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[var(--valor-green)]/30 bg-white px-6 py-10 text-center shadow-sm active:scale-[0.99]"
              >
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--valor-green)] text-white shadow-sm">
                  <Camera className="h-9 w-9" />
                </div>
                <p className="text-lg text-[#1C1C1E]">{t("priceEntry.takePhoto")}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {isGroceryVenue ? t("priceEntry.grocery.captureShelfTag") : t("priceEntry.capturePriceDisplay")}
                </p>
              </button>
            )}

            <div className="rounded-[24px] border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
              <p className="mb-2 text-sm">{t("priceEntry.photoTips")}</p>
              <ul className="space-y-1 text-xs text-blue-800">
                <li>• {t("priceEntry.photoTip1")}</li>
                <li>• {t("priceEntry.photoTip3")}</li>
                <li>• {t("priceEntry.photoTip2")}</li>
              </ul>
            </div>
          </div>
        ) : null}

        {currentStep === "review" ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl text-[#1C1C1E]">
                {isGroceryVenue ? t("priceEntry.grocery.reviewSubmit") : t("priceEntry.reviewSubmit")}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {isGroceryVenue ? t("priceEntry.grocery.confirmDetails") : t("priceEntry.confirmDetails")}
              </p>
            </div>

            <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">
                {isGroceryVenue ? t("priceEntry.grocery.storeLabel") : t("priceEntry.gasStation")}
              </p>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--valor-green)]/10 text-lg">
                  {isGroceryVenue ? "🛒" : "⛽"}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-base text-[#1C1C1E]">{station.name}</p>
                  {station.address ? <p className="mt-1 line-clamp-2 text-sm text-gray-500">{station.address}</p> : null}
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">
                {isGroceryVenue && grocerySubmissionKind === "basket" ? t("priceEntry.grocery.basketSummary") : t("priceEntry.productAndPrice")}
              </p>
              {isGroceryVenue && grocerySubmissionKind === "basket" && selectedBasket ? (
                <div className="mt-3 space-y-3">
                  {basketEntries
                    .filter((entry): entry is { product: GroceryProductDefinition; value: string } => Boolean(entry.product))
                    .map((entry) => (
                      <div key={entry.product.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--valor-bg)] px-3 py-3">
                        <div>
                          <p className="text-sm text-[#1C1C1E]">{entry.product.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{entry.product.unitLabel}</p>
                        </div>
                        <p className="text-sm text-[var(--valor-green)]">{formatCurrency(Number.parseFloat(entry.value) || 0, currency)}</p>
                      </div>
                    ))}
                  <div className="flex items-center justify-between rounded-2xl border border-[var(--valor-green)]/20 bg-[var(--valor-green)]/5 px-4 py-4">
                    <p className="text-sm text-[#1C1C1E]">{t("priceEntry.grocery.basketTotalLabel")}</p>
                    <p className="text-2xl text-[var(--valor-green)]">{formatCurrency(basketTotal, currency)}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base text-[#1C1C1E]">
                      {isGroceryVenue ? selectedGroceryProduct?.name : selectedProduct}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {isGroceryVenue ? selectedGroceryProduct?.unitLabel : gasProducts.find((product) => product.id === selectedProduct)?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl text-[var(--valor-green)]">{currencies.find((option) => option.code === currency)?.symbol}{price}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {isGroceryVenue ? t("priceEntry.grocery.fixedUnitPrice") : t("priceEntry.perGallon")}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {capturedPhoto ? (
              <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.08em] text-gray-500">{t("priceEntry.photoEvidence")}</p>
                <img src={capturedPhoto} alt="Price evidence" className="mt-3 aspect-[4/3] w-full rounded-[20px] object-cover" />
              </section>
            ) : null}

            <section className="rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500">{t("priceEntry.locationVerification")}</p>
              <div className="mt-3 flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  distanceFromStation !== null && distanceFromStation <= 500
                    ? "bg-[var(--valor-green)]/15 text-[var(--valor-green)]"
                    : "bg-red-100 text-red-600"
                )}>
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-sm">
                  {distanceFromStation !== null ? (
                    distanceFromStation <= 500 ? (
                      <p className="text-[var(--valor-green)]">✓ {t("priceEntry.locationVerified", { distance: Math.round(distanceFromStation) })}</p>
                    ) : (
                      <p className="text-red-600">✗ {t("priceEntry.tooFarFromStation", { distance: Math.round(distanceFromStation) })}</p>
                    )
                  ) : (
                    <p className="text-gray-500">{t("priceEntry.gettingLocation")}</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <WorldIdVerificationSheet
        isOpen={isWorldIdSheetOpen}
        onClose={() => setIsWorldIdSheetOpen(false)}
        onVerified={async () => {
          await refreshWorldIdStatus()
          setNotice({
            tone: "success",
            title: t("worldId.verified"),
            detail: t("worldId.verifiedDetail"),
          })
        }}
        reason="submit_price"
        action={worldIdAction}
      />
    </MobileScreen>
  )
}

function getFontSize(value: string) {
  const digitCount = value.replace(/[^0-9]/g, "").length
  if (digitCount <= 3) return "3.25rem"
  if (digitCount <= 4) return "2.85rem"
  if (digitCount <= 5) return "2.35rem"
  if (digitCount <= 6) return "1.95rem"
  return "1.7rem"
}

function isStepCompleted(step: Step, canProceedFromProduct: boolean, canProceedFromPrice: boolean, capturedPhoto: string | null) {
  if (step === "product") return canProceedFromProduct
  if (step === "price") return canProceedFromPrice
  if (step === "photo") return capturedPhoto !== null
  return false
}

function resetGroceryFlow(
  setCurrentStep: (step: Step) => void,
  setSelectedProduct: (value: string) => void,
  setSelectedBasketId: (value: string) => void,
  setBasketPrices: (value: Record<string, string>) => void,
  setPrice: (value: string) => void,
  setCapturedPhoto: (value: string | null) => void,
  setGrocerySubmissionKind: (value: GrocerySubmissionKind) => void
) {
  setCurrentStep("product")
  setSelectedProduct("")
  setSelectedBasketId("")
  setBasketPrices({})
  setPrice("")
  setCapturedPhoto(null)
  setGrocerySubmissionKind("item")
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(value)
}

async function getCurrencyFromLocation(lat: number, lng: number) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    const data = await response.json()
    const countryCode = data.address?.country_code?.toUpperCase()
    const currencyMap: Record<string, string> = {
      US: "USD", GB: "GBP", JP: "JPY", CN: "CNY", AU: "AUD", CA: "CAD", CH: "CHF", IN: "INR", MX: "MXN", BR: "BRL",
      AR: "ARS", KR: "KRW", SG: "SGD", NZ: "NZD", ZA: "ZAR", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN",
      DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
      GR: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", SK: "EUR", SI: "EUR", CY: "EUR", MT: "EUR", LU: "EUR",
    }
    return currencyMap[countryCode] || "USD"
  } catch (error) {
    console.error("Error fetching location currency:", error)
    return "USD"
  }
}
