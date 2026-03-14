"use client"

export type GroceryCountry = "US" | "AR"
export type GrocerySubmissionKind = "item" | "basket"
export type GroceryCategory = "dairy" | "produce" | "pantry" | "bakery" | "beverages"

export interface GroceryProductDefinition {
  id: string
  name: string
  unitLabel: string
  category: GroceryCategory
  description: string
  lastKnownPrice: number
  currency: string
}

export interface GroceryBasketDefinition {
  id: string
  label: string
  subtitle: string
  items: string[]
}

export interface GroceryProposalDraft {
  id: string
  stationId: string
  country: GroceryCountry
  name: string
  unitLabel: string
  category: GroceryCategory
  createdAt: string
  status: "pending"
}

export interface GroceryDrawerSnapshot {
  latestItem: {
    productName: string
    unitLabel: string
    price: number
    currency: string
    submittedAtLabel: string
  }
  latestBasket: {
    basketLabel: string
    total: number
    currency: string
    itemCount: number
    submittedAtLabel: string
  }
}

type GroceryItemSubmission = {
  id: string
  stationId: string
  country: GroceryCountry
  productId: string
  price: number
  currency: string
  createdAt: string
}

type GroceryBasketSubmission = {
  id: string
  stationId: string
  country: GroceryCountry
  basketId: string
  items: Array<{ productId: string; price: number }>
  currency: string
  createdAt: string
}

const STORAGE_KEYS = {
  itemSubmissions: "valor-grocery-item-submissions",
  basketSubmissions: "valor-grocery-basket-submissions",
  proposals: "valor-grocery-product-proposals",
} as const

const CATALOG: Record<GroceryCountry, GroceryProductDefinition[]> = {
  US: [
    { id: "whole-milk-1gal", name: "Whole milk", unitLabel: "1 gal", category: "dairy", description: "Standard full-fat milk", lastKnownPrice: 4.89, currency: "USD" },
    { id: "eggs-dozen", name: "Large eggs", unitLabel: "12 ct", category: "dairy", description: "One dozen large eggs", lastKnownPrice: 3.69, currency: "USD" },
    { id: "white-bread-loaf", name: "White bread", unitLabel: "20 oz loaf", category: "bakery", description: "Basic sandwich loaf", lastKnownPrice: 2.79, currency: "USD" },
    { id: "long-grain-rice", name: "Rice", unitLabel: "2 lb bag", category: "pantry", description: "Long-grain white rice", lastKnownPrice: 3.49, currency: "USD" },
    { id: "bananas-bunch", name: "Bananas", unitLabel: "3 lb bunch", category: "produce", description: "Fresh yellow bananas", lastKnownPrice: 2.39, currency: "USD" },
    { id: "orange-juice", name: "Orange juice", unitLabel: "52 fl oz", category: "beverages", description: "Chilled orange juice", lastKnownPrice: 4.59, currency: "USD" },
  ],
  AR: [
    { id: "leche-entera-1l", name: "Leche entera", unitLabel: "1 L", category: "dairy", description: "Leche entera refrigerada", lastKnownPrice: 1650, currency: "ARS" },
    { id: "huevos-docena", name: "Huevos", unitLabel: "12 un", category: "dairy", description: "Docena de huevos grandes", lastKnownPrice: 3100, currency: "ARS" },
    { id: "pan-lactal", name: "Pan lactal", unitLabel: "600 g", category: "bakery", description: "Pan de molde clásico", lastKnownPrice: 2900, currency: "ARS" },
    { id: "arroz-1kg", name: "Arroz", unitLabel: "1 kg", category: "pantry", description: "Arroz blanco largo fino", lastKnownPrice: 2300, currency: "ARS" },
    { id: "bananas-1kg", name: "Bananas", unitLabel: "1 kg", category: "produce", description: "Banana fresca", lastKnownPrice: 2400, currency: "ARS" },
    { id: "jugo-naranja-1l", name: "Jugo de naranja", unitLabel: "1 L", category: "beverages", description: "Jugo refrigerado", lastKnownPrice: 3400, currency: "ARS" },
  ],
}

const BASKETS: Record<GroceryCountry, GroceryBasketDefinition[]> = {
  US: [
    {
      id: "weekly-essentials",
      label: "Weekly essentials basket",
      subtitle: "6 staple items",
      items: ["whole-milk-1gal", "eggs-dozen", "white-bread-loaf", "long-grain-rice", "bananas-bunch", "orange-juice"],
    },
  ],
  AR: [
    {
      id: "canasta-esencial",
      label: "Canasta esencial",
      subtitle: "6 productos base",
      items: ["leche-entera-1l", "huevos-docena", "pan-lactal", "arroz-1kg", "bananas-1kg", "jugo-naranja-1l"],
    },
  ],
}

function readSessionStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeSessionStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(key, JSON.stringify(value))
}

export function getCountryFromLocale(locale: string): GroceryCountry {
  return locale === "es-AR" ? "AR" : "US"
}

export function getGroceryCatalog(country: GroceryCountry) {
  return CATALOG[country]
}

export function getGroceryBaskets(country: GroceryCountry) {
  return BASKETS[country]
}

export function getPendingGroceryProposals(stationId: string, country: GroceryCountry) {
  const proposals = readSessionStorage<GroceryProposalDraft[]>(STORAGE_KEYS.proposals, [])
  return proposals.filter((proposal) => proposal.stationId === stationId && proposal.country === country)
}

export function createPendingGroceryProposal(input: Omit<GroceryProposalDraft, "id" | "createdAt" | "status">) {
  const proposals = readSessionStorage<GroceryProposalDraft[]>(STORAGE_KEYS.proposals, [])
  const nextProposal: GroceryProposalDraft = {
    ...input,
    id: `proposal-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "pending",
  }
  writeSessionStorage(STORAGE_KEYS.proposals, [nextProposal, ...proposals])
  return nextProposal
}

export function saveGroceryItemSubmission(input: Omit<GroceryItemSubmission, "id" | "createdAt">) {
  const submissions = readSessionStorage<GroceryItemSubmission[]>(STORAGE_KEYS.itemSubmissions, [])
  const nextSubmission: GroceryItemSubmission = {
    ...input,
    id: `item-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  writeSessionStorage(STORAGE_KEYS.itemSubmissions, [nextSubmission, ...submissions])
  return nextSubmission
}

export function saveGroceryBasketSubmission(input: Omit<GroceryBasketSubmission, "id" | "createdAt">) {
  const submissions = readSessionStorage<GroceryBasketSubmission[]>(STORAGE_KEYS.basketSubmissions, [])
  const nextSubmission: GroceryBasketSubmission = {
    ...input,
    id: `basket-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  writeSessionStorage(STORAGE_KEYS.basketSubmissions, [nextSubmission, ...submissions])
  return nextSubmission
}

export function getGroceryDrawerSnapshot(stationId: string, country: GroceryCountry): GroceryDrawerSnapshot {
  const catalog = getGroceryCatalog(country)
  const baskets = getGroceryBaskets(country)
  const itemSubmissions = readSessionStorage<GroceryItemSubmission[]>(STORAGE_KEYS.itemSubmissions, [])
  const basketSubmissions = readSessionStorage<GroceryBasketSubmission[]>(STORAGE_KEYS.basketSubmissions, [])

  const latestItem = itemSubmissions.find((submission) => submission.stationId === stationId && submission.country === country)
  const latestBasket = basketSubmissions.find((submission) => submission.stationId === stationId && submission.country === country)

  const fallbackItem = catalog[0]
  const fallbackBasket = baskets[0]

  if (latestItem) {
    const product = catalog.find((entry) => entry.id === latestItem.productId) ?? fallbackItem
    return {
      latestItem: {
        productName: product.name,
        unitLabel: product.unitLabel,
        price: latestItem.price,
        currency: latestItem.currency,
        submittedAtLabel: formatSessionTimestamp(latestItem.createdAt),
      },
      latestBasket: latestBasket
        ? {
            basketLabel: (baskets.find((entry) => entry.id === latestBasket.basketId) ?? fallbackBasket).label,
            total: latestBasket.items.reduce((sum, item) => sum + item.price, 0),
            currency: latestBasket.currency,
            itemCount: latestBasket.items.length,
            submittedAtLabel: formatSessionTimestamp(latestBasket.createdAt),
          }
        : {
            basketLabel: fallbackBasket.label,
            total: fallbackBasket.items.reduce((sum, itemId) => sum + (catalog.find((entry) => entry.id === itemId)?.lastKnownPrice ?? 0), 0),
            currency: fallbackItem.currency,
            itemCount: fallbackBasket.items.length,
            submittedAtLabel: "Today",
          },
    }
  }

  return {
    latestItem: {
      productName: fallbackItem.name,
      unitLabel: fallbackItem.unitLabel,
      price: fallbackItem.lastKnownPrice,
      currency: fallbackItem.currency,
      submittedAtLabel: "Today",
    },
    latestBasket: latestBasket
      ? {
          basketLabel: (baskets.find((entry) => entry.id === latestBasket.basketId) ?? fallbackBasket).label,
          total: latestBasket.items.reduce((sum, item) => sum + item.price, 0),
          currency: latestBasket.currency,
          itemCount: latestBasket.items.length,
          submittedAtLabel: formatSessionTimestamp(latestBasket.createdAt),
        }
      : {
          basketLabel: fallbackBasket.label,
          total: fallbackBasket.items.reduce((sum, itemId) => sum + (catalog.find((entry) => entry.id === itemId)?.lastKnownPrice ?? 0), 0),
          currency: fallbackItem.currency,
          itemCount: fallbackBasket.items.length,
          submittedAtLabel: "Today",
        },
  }
}

export function formatSessionTimestamp(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
}
