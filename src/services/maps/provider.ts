import { AppleMapsProvider } from "@/services/maps/apple-maps-provider"
import type { MapProvider } from "@/services/maps/types"

const appleProvider = new AppleMapsProvider()

export function getMapProvider(): MapProvider {
  const provider = process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "apple"

  switch (provider) {
    case "apple":
      return appleProvider
    default:
      throw new Error(`Unsupported map provider: ${provider}`)
  }
}
