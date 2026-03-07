"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ExternalLink } from "lucide-react"
import { BottomSheet, StickyActionBar } from "@/components/mobile"
import type { MapVenue } from "@/types"

interface PriceSubmissionDrawerProps {
  isOpen: boolean
  station: MapVenue | null
  userLocation: { latitude: number; longitude: number } | null
  onClose: () => void
  onSuccess: () => void
  onOpenSubmitPage?: (station: MapVenue) => void
}

interface LastPrice {
  price: number | null
  fuelType: string | null
  createdAt: string | null
  submittedBy: string | null
}

export function PriceSubmissionDrawer({
  isOpen,
  station,
  onClose,
  onOpenSubmitPage,
}: PriceSubmissionDrawerProps) {
  const t = useTranslations()
  const [lastPrice, setLastPrice] = useState<LastPrice | null>(null)
  const [isLoadingPrice, setIsLoadingPrice] = useState(false)

  useEffect(() => {
    if (!isOpen || !station) {
      setLastPrice(null)
      setIsLoadingPrice(false)
      return
    }

    const controller = new AbortController()

    const fetchLastPrice = async () => {
      setIsLoadingPrice(true)
      try {
        const response = await fetch(`/api/stations/${encodeURIComponent(station.id)}/last-price`, {
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok || data.error) {
          const message = String(data.error ?? "")
          if (!message.includes("price_submissions")) {
            console.error("Error fetching last price:", data.error ?? response.statusText)
          }
          setLastPrice(null)
          return
        }

        setLastPrice(data)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching last price:", error)
        }
        setLastPrice(null)
      } finally {
        setIsLoadingPrice(false)
      }
    }

    void fetchLastPrice()

    return () => controller.abort()
  }, [isOpen, station])

  if (!station) {
    return null
  }

  const isReadOnlyVenue = station.submissionMode === "read_only"
  const markerGlyph = getVenueGlyph(station)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={station.name}
      description={station.address}
      closeLabel={t("common.close")}
      header={
        <div className="pr-12">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--valor-bg-soft)] text-2xl">
              {markerGlyph}
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-2 text-xl text-[#1C1C1E]">{station.name}</h2>
              {station.address ? <p className="mt-1 line-clamp-2 text-sm text-gray-500">{station.address}</p> : null}
            </div>
          </div>
        </div>
      }
      footer={
        <StickyActionBar className="border-t border-black/5 bg-white" innerClassName="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
          <a
            href={`https://maps.apple.com/?daddr=${station.latitude},${station.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("drawer.openInMaps")}
            title={t("drawer.openInMaps")}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-[#1C1C1E] active:scale-95"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          {isReadOnlyVenue ? (
            <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[var(--valor-bg-soft)] px-4 text-sm text-gray-600">
              {t("drawer.submissionComingSoon")}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenSubmitPage?.(station)}
              className="min-h-12 rounded-2xl bg-gradient-to-r from-[var(--valor-green)] to-[var(--valor-green-dark)] px-4 text-sm text-white active:scale-[0.99]"
            >
              {t("drawer.submitPrice")}
            </button>
          )}
        </StickyActionBar>
      }
      bodyClassName="gap-4"
    >
      <section className="rounded-3xl border border-black/5 bg-[var(--valor-bg)] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">{t("drawer.lastPrice")}</span>
          {isLoadingPrice ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-black/10" />
          ) : lastPrice?.price ? (
            <span className="text-2xl text-[var(--valor-green)]">${lastPrice.price.toFixed(2)}</span>
          ) : (
            <span className="text-2xl text-[var(--valor-green)]">$—</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-xs text-gray-500">
          {lastPrice?.price ? (
            <p className="truncate">
              {lastPrice.fuelType} • {new Date(lastPrice.createdAt ?? "").toLocaleDateString()}
            </p>
          ) : (
            <p>{t("drawer.noRecentData")}</p>
          )}
          <span>{t("drawer.perGallon")}</span>
        </div>
      </section>
    </BottomSheet>
  )
}

function getVenueGlyph(station: MapVenue) {
  const categories = new Set(station.categories ?? [])
  if (categories.has("grocery_store") && categories.has("gas_station")) return "🛒⛽"
  if (categories.has("grocery_store")) return "🛒"
  return "⛽"
}
