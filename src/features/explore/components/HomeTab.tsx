"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Coins, Navigation, ChevronDown, Check } from "lucide-react"
import { useSession } from "next-auth/react"
import type { MapVenue, UserLocation } from "@/types"
import { formatDistance } from "@/lib/utils"
import { SearchBar } from "./SearchBar"

interface HomeTabProps {
  gasStations: MapVenue[]
  userLocation: UserLocation | null
  onStationSelect: (station: MapVenue) => void
  stationData: Record<
    string,
    {
      submissionCount: number
      potentialEarning: number
      latestPrice?: number
      latestFuelType?: string
      priceUpdatedAt?: string
    }
  >
  setStationData: React.Dispatch<
    React.SetStateAction<
      Record<
        string,
        {
          submissionCount: number
          potentialEarning: number
          latestPrice?: number
          latestFuelType?: string
          priceUpdatedAt?: string
        }
      >
    >
  >
  isLoadingStationData: boolean
  setIsLoadingStationData: React.Dispatch<React.SetStateAction<boolean>>
}

type SortOption = "proximity" | "priority" | "price-low" | "price-high"

export function HomeTab({
  gasStations,
  userLocation,
  onStationSelect,
  stationData,
  setStationData,
  isLoadingStationData,
  setIsLoadingStationData,
}: HomeTabProps) {
  const t = useTranslations()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("proximity")
  const [userStationSubmissions, setUserStationSubmissions] = useState<Record<string, string[]>>({})
  const [todaysCoverage, setTodaysCoverage] = useState(0)

  const uniqueStations = useMemo(
    () => gasStations.filter((station, index, self) => index === self.findIndex((candidate) => candidate.id === station.id)),
    [gasStations]
  )

  const filteredStations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return uniqueStations
    return uniqueStations.filter((station) =>
      station.name.toLowerCase().includes(normalizedQuery) ||
      station.address?.toLowerCase().includes(normalizedQuery)
    )
  }, [searchQuery, uniqueStations])

  const getUserSubmissionCount = useCallback(
    (stationId: string) => (userStationSubmissions[stationId] || []).length,
    [userStationSubmissions]
  )

  const isStationComplete = useCallback(
    (stationId: string) => getUserSubmissionCount(stationId) >= 3,
    [getUserSubmissionCount]
  )

  const calculateSignal = useCallback((distance: number | undefined) => {
    if (!distance) return 2.5
    const baseSignal = 2.5
    const proximityBonus = distance < 200 ? 1.0 : distance < 500 ? 0.5 : 0
    return baseSignal + proximityBonus
  }, [])

  const sortedStations = useMemo(() => {
    return [...filteredStations].sort((a, b) => {
      const aComplete = isStationComplete(a.id)
      const bComplete = isStationComplete(b.id)
      const aSubmissionCount = getUserSubmissionCount(a.id)
      const bSubmissionCount = getUserSubmissionCount(b.id)
      const aPrice = stationData[a.id]?.latestPrice || 0
      const bPrice = stationData[b.id]?.latestPrice || 0
      const aDistance = a.distance || Number.POSITIVE_INFINITY
      const bDistance = b.distance || Number.POSITIVE_INFINITY

      switch (sortOption) {
        case "proximity":
          if (aComplete && !bComplete) return 1
          if (!aComplete && bComplete) return -1
          return aDistance - bDistance
        case "priority":
          if (aSubmissionCount === 0 && bSubmissionCount > 0) return -1
          if (aSubmissionCount > 0 && bSubmissionCount === 0) return 1
          return aDistance - bDistance
        case "price-low":
          if (aPrice === 0 && bPrice > 0) return 1
          if (aPrice > 0 && bPrice === 0) return -1
          if (aPrice !== bPrice) return aPrice - bPrice
          return aDistance - bDistance
        case "price-high":
          if (aPrice === 0 && bPrice > 0) return 1
          if (aPrice > 0 && bPrice === 0) return -1
          if (aPrice !== bPrice) return bPrice - aPrice
          return aDistance - bDistance
        default:
          return aDistance - bDistance
      }
    })
  }, [filteredStations, getUserSubmissionCount, isStationComplete, sortOption, stationData])

  const refreshUserSubmissions = useCallback(async () => {
    if (!session?.user?.walletAddress) {
      setUserStationSubmissions({})
      return
    }

    try {
      const response = await fetch("/api/user-station-submissions")
      const data = await response.json()
      if (data.success && data.stationSubmissions) {
        setUserStationSubmissions(data.stationSubmissions)
      }
    } catch (error) {
      console.error("Error fetching user submissions:", error)
    }
  }, [session?.user?.walletAddress])

  useEffect(() => {
    void refreshUserSubmissions()
  }, [refreshUserSubmissions])

  useEffect(() => {
    if (!session?.user?.walletAddress) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshUserSubmissions()
      }
    }

    const handleFocus = () => {
      void refreshUserSubmissions()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [refreshUserSubmissions, session?.user?.walletAddress])

  useEffect(() => {
    const controller = new AbortController()

    const fetchCoverage = async () => {
      try {
        const response = await fetch("/api/todays-rewards", { signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        setTodaysCoverage(typeof data.remaining === "number" ? data.remaining : 0)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching today's coverage:", error)
        }
      }
    }

    void fetchCoverage()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const stationIdsToFetch = uniqueStations.filter((station) => !stationData[station.id]).map((station) => station.id)
    if (stationIdsToFetch.length === 0) return

    const controller = new AbortController()

    const fetchStationData = async () => {
      setIsLoadingStationData(true)
      try {
        const response = await fetch("/api/station-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stationIds: stationIdsToFetch }),
          signal: controller.signal,
        })

        if (!response.ok) return
        const data = await response.json()
        if (data.success) {
          setStationData((previous) => ({ ...previous, ...data.stationData }))
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching station data:", error)
        }
      } finally {
        setIsLoadingStationData(false)
      }
    }

    void fetchStationData()

    return () => controller.abort()
  }, [setIsLoadingStationData, setStationData, stationData, uniqueStations])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--valor-bg)]">
      <header className="shrink-0 bg-gradient-to-r from-[var(--valor-green)] to-[var(--valor-green-dark)] text-white shadow-sm">
        <div className="safe-px-app px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-white/12 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/80">{t("homeTab.stationsNearby")}</p>
              <p className="mt-2 text-2xl text-white">{t("homeTab.stationsCount", { count: filteredStations.length })}</p>
            </div>
            <div className="rounded-[24px] bg-black/12 px-4 py-3 text-right backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/80">{t("homeTab.coveragePool")}</p>
              <p className="mt-2 text-2xl text-white">${todaysCoverage.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-white/80">{userLocation ? t("homeTab.locationActive") : t("homeTab.locationPending")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="safe-px-app flex flex-col gap-3 px-4 py-3">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <div className="relative w-full">
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              className="min-h-12 w-full appearance-none rounded-2xl border border-black/10 bg-[var(--valor-bg)] px-4 pr-11 text-sm text-[#1C1C1E] focus:border-[var(--valor-green)] focus:outline-none"
              aria-label={t("homeTab.sortLabel")}
            >
              <option value="proximity">{t("homeTab.sort.proximity")}</option>
              <option value="priority">{t("homeTab.sort.priority")}</option>
              <option value="price-low">{t("homeTab.sort.priceLow")}</option>
              <option value="price-high">{t("homeTab.sort.priceHigh")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        <div className="flex flex-col gap-3">
          {sortedStations.length === 0 ? (
            <div className="rounded-[28px] border border-black/5 bg-white px-5 py-8 text-center shadow-sm">
              <div className="text-5xl text-gray-400">🛒⛽</div>
              <p className="mt-4 text-base text-[#1C1C1E]">{t("homeTab.noStationsFound")}</p>
              <p className="mt-2 text-sm text-gray-500">{t("homeTab.adjustSearch")}</p>
            </div>
          ) : (
            sortedStations.map((station) => {
              const isComplete = isStationComplete(station.id)
              const data = stationData[station.id]
              const isStationLoading = isLoadingStationData && !data
              const signal = data?.potentialEarning || calculateSignal(station.distance)
              const submissionCount = data?.submissionCount || 0
              const latestPrice = data?.latestPrice
              const latestFuelType = data?.latestFuelType

              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => onStationSelect(station)}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition-transform active:scale-[0.99] ${
                    isComplete ? "border-black/5 bg-white/70 opacity-70" : "border-black/5 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--valor-bg-soft)] text-2xl">
                      {station.photo ? (
                        <img src={station.photo} alt={station.name} className="h-full w-full object-cover" />
                      ) : (
                        getVenueGlyph(station)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="line-clamp-2 text-base text-[#1C1C1E]">{station.name}</h3>
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[11px] text-green-700">
                                <Check className="h-3 w-3" />
                              <span>{t("homeTab.complete")}</span>
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{station.address}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          {isStationLoading ? (
                            <div className="mt-1 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--valor-green)]" />
                          ) : latestPrice ? (
                            <>
                              <p className="text-xl text-[#1C1C1E]">${latestPrice.toFixed(2)}</p>
                              <p className="mt-1 text-xs text-gray-500">{latestFuelType || "Regular"}</p>
                              {submissionCount > 0 ? (
                                <p className="mt-2 text-[11px] text-gray-400">
                                  {submissionCount} {submissionCount === 1 ? t("plurals.update") : t("plurals.updates")}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-400">{t("status.noPrice")}</p>
                              {submissionCount > 0 ? (
                                <p className="mt-2 text-[11px] text-gray-400">
                                  {submissionCount} {submissionCount === 1 ? t("plurals.update") : t("plurals.updates")}
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {station.distance !== undefined ? (
                          <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[var(--valor-bg-soft)] px-3 text-xs text-gray-700">
                            <Navigation className="h-3.5 w-3.5" />
                            {formatDistance(station.distance, t)}
                          </span>
                        ) : null}
                        <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[var(--valor-green)] px-3 text-xs text-white">
                          <Coins className="h-3.5 w-3.5" />
                          {t("homeTab.signalLabel", { amount: signal.toFixed(2) })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function getVenueGlyph(station: MapVenue) {
  const categories = new Set(station.categories ?? [])
  if (categories.has("grocery_store") && categories.has("gas_station")) return "🛒⛽"
  if (categories.has("grocery_store")) return "🛒"
  return "⛽"
}
