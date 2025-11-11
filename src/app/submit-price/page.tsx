import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PriceEntryPage } from "@/components/PriceEntryPage"

export default async function SubmitPricePage({
  searchParams,
}: {
  searchParams: { stationId?: string; stationName?: string; lat?: string; lng?: string }
}) {
  const session = await auth()

  if (!session?.user?.walletAddress) {
    redirect("/")
  }

  if (!searchParams.stationId || !searchParams.stationName || !searchParams.lat || !searchParams.lng) {
    redirect("/")
  }

  return (
    <PriceEntryPage
      stationId={searchParams.stationId}
      stationName={decodeURIComponent(searchParams.stationName)}
      stationLat={parseFloat(searchParams.lat)}
      stationLng={parseFloat(searchParams.lng)}
    />
  )
}
