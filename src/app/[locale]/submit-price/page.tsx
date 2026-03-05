import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import PriceEntryPage from "@/components/PriceSubmissionDrawer/PriceEntryPageDrawer"
import type { GasStation } from "@/types"

export const metadata: Metadata = {
  title: "Submit Price",
  description: "Submit a new gas price entry in Valor.",
}

type SubmitPricePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function SubmitPricePage({ searchParams }: SubmitPricePageProps) {
  const session = await auth()
  if (!session?.user?.walletAddress) {
    redirect("/")
  }

  const params = await searchParams
  const stationId = first(params.stationId)
  const stationName = first(params.stationName)
  const lat = first(params.lat)
  const lng = first(params.lng)
  const address = first(params.address)

  if (!stationId || !stationName || !lat || !lng) {
    return null
  }

  const station: GasStation = {
    id: stationId,
    name: decodeURIComponent(stationName),
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    address: address ? decodeURIComponent(address) : '',
    placeId: stationId, // Use stationId as placeId if not provided separately
    types: [], // Types not available from URL params
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
