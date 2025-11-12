'use client'

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import PriceEntryPage from "@/components/PriceSubmissionDrawer/PriceEntryPageDrawer"
import type { GasStation } from "@/types"

export default function SubmitPricePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.walletAddress) {
      router.push("/")
    }
  }, [session, router])

  const stationId = searchParams.get('stationId')
  const stationName = searchParams.get('stationName')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const address = searchParams.get('address')

  if (!stationId || !stationName || !lat || !lng) {
    return null
  }

  const station: GasStation = {
    id: stationId,
    name: decodeURIComponent(stationName),
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    address: address ? decodeURIComponent(address) : '',
  }

  const handleSuccess = () => {
    // Success is handled by the component (router.back())
  }

  return (
    <PriceEntryPage
      station={station}
      userLocation={null}
      onSuccess={handleSuccess}
    />
  )
}
