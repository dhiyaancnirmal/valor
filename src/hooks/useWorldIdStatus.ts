"use client"

import { useCallback, useEffect, useState } from "react"

export type WorldIdStatus = {
  enabled: boolean
  verified: boolean
  appId?: string | null
  action?: string
  environment?: "production" | "staging"
}

const DEFAULT_STATUS: WorldIdStatus = {
  enabled: false,
  verified: false,
  appId: null,
}

export function useWorldIdStatus(active = true) {
  const [status, setStatus] = useState<WorldIdStatus>(DEFAULT_STATUS)
  const [isLoading, setIsLoading] = useState(active)

  const refresh = useCallback(async () => {
    if (!active) return DEFAULT_STATUS

    setIsLoading(true)
    try {
      const response = await fetch("/api/world-id/status", { cache: "no-store" })
      if (!response.ok) {
        setStatus(DEFAULT_STATUS)
        return DEFAULT_STATUS
      }

      const data = (await response.json()) as WorldIdStatus
      const nextStatus = {
        enabled: Boolean(data.enabled),
        verified: Boolean(data.verified),
        appId: data.appId ?? null,
        action: data.action,
        environment: data.environment,
      }
      setStatus(nextStatus)
      return nextStatus
    } catch {
      setStatus(DEFAULT_STATUS)
      return DEFAULT_STATUS
    } finally {
      setIsLoading(false)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    void refresh()
  }, [active, refresh])

  return {
    ...status,
    isLoading,
    refresh,
  }
}
