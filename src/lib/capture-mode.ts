"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "valor_capture_mode"

function parseCaptureParam(value: string | null): boolean | null {
  if (value === null) return null
  return value === "1" || value.toLowerCase() === "true"
}

export function useCaptureMode() {
  const [captureMode, setCaptureModeState] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const url = new URL(window.location.href)
    const queryValue = parseCaptureParam(url.searchParams.get("capture"))

    if (queryValue !== null) {
      setTimeout(() => setCaptureModeState(queryValue), 0)
      localStorage.setItem(STORAGE_KEY, queryValue ? "1" : "0")
      return
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    setTimeout(() => setCaptureModeState(stored === "1"), 0)
  }, [])

  const setCaptureMode = useCallback((enabled: boolean) => {
    setCaptureModeState(enabled)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0")
    }
  }, [])

  return useMemo(
    () => ({
      captureMode,
      setCaptureMode,
    }),
    [captureMode, setCaptureMode]
  )
}
