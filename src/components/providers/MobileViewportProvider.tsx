"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type MobileViewportState = {
  viewportHeight: number
  keyboardInset: number
  keyboardOpen: boolean
}

const DEFAULT_STATE: MobileViewportState = {
  viewportHeight: 0,
  keyboardInset: 0,
  keyboardOpen: false,
}

const MobileViewportContext = createContext<MobileViewportState>(DEFAULT_STATE)

function getViewportSnapshot(): MobileViewportState {
  if (typeof window === "undefined") {
    return DEFAULT_STATE
  }

  const visualViewport = window.visualViewport
  const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight)
  const keyboardInset = Math.max(
    0,
    Math.round(window.innerHeight - viewportHeight - (visualViewport?.offsetTop ?? 0))
  )

  return {
    viewportHeight,
    keyboardInset,
    keyboardOpen: keyboardInset > 80,
  }
}

export function MobileViewportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MobileViewportState>(DEFAULT_STATE)

  useEffect(() => {
    const root = document.documentElement
    let rafId = 0

    const updateViewport = () => {
      cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        const nextState = getViewportSnapshot()
        root.style.setProperty(
          "--app-viewport-height",
          nextState.viewportHeight > 0 ? `${nextState.viewportHeight}px` : "100dvh"
        )
        root.style.setProperty("--keyboard-offset", `${nextState.keyboardOpen ? nextState.keyboardInset : 0}px`)
        root.dataset.keyboardOpen = nextState.keyboardOpen ? "true" : "false"
        setState(nextState)
      })
    }

    updateViewport()

    window.addEventListener("resize", updateViewport)
    window.addEventListener("orientationchange", updateViewport)
    window.visualViewport?.addEventListener("resize", updateViewport)
    window.visualViewport?.addEventListener("scroll", updateViewport)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", updateViewport)
      window.removeEventListener("orientationchange", updateViewport)
      window.visualViewport?.removeEventListener("resize", updateViewport)
      window.visualViewport?.removeEventListener("scroll", updateViewport)
    }
  }, [])

  const value = useMemo(() => state, [state])

  return <MobileViewportContext.Provider value={value}>{children}</MobileViewportContext.Provider>
}

export function useMobileViewport() {
  return useContext(MobileViewportContext)
}
