"use client"

import {
  type ReactNode,
  type TouchEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  closeLabel?: string
  header?: ReactNode
  footer?: ReactNode
  blocking?: boolean
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  contentClassName?: string
  sheetClassName?: string
  bodyClassName?: string
  zIndexClassName?: string
}

const CLOSE_THRESHOLD_PX = 96

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  closeLabel = "Close",
  header,
  footer,
  blocking = true,
  showCloseButton = true,
  closeOnBackdrop = true,
  contentClassName,
  sheetClassName,
  bodyClassName,
  zIndexClassName = "z-[120]",
}: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef<number | null>(null)
  const previousOverflowRef = useRef<string | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen || !blocking) return

    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflowRef.current ?? ""
    }
  }, [isOpen, blocking])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0]?.clientY ?? null
    setIsDragging(true)
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isDragging || startYRef.current === null) return
    const delta = (event.touches[0]?.clientY ?? startYRef.current) - startYRef.current
    setDragOffset(Math.max(0, delta))
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    startYRef.current = null
    if (dragOffset > CLOSE_THRESHOLD_PX) {
      onClose()
      return
    }
    setDragOffset(0)
  }

  return (
    <div className={cn("pointer-events-none fixed inset-0", zIndexClassName)}>
      {blocking ? (
        <button
          type="button"
          aria-label={closeLabel}
          className="pointer-events-auto absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
          style={{ opacity: 1 }}
          onClick={closeOnBackdrop ? onClose : undefined}
        />
      ) : null}

      <div className={cn("absolute inset-0 flex items-end", blocking ? "pointer-events-none" : "pointer-events-none")}>
        <div
          role="dialog"
          aria-modal={blocking}
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-t-[28px] border border-black/5 bg-white shadow-[0_-10px_28px_rgba(15,23,42,0.14)] transition-all duration-200 ease-out",
            sheetClassName
          )}
          style={{
            maxHeight: "calc(var(--app-viewport-height, 100dvh) - max(env(safe-area-inset-top, 0px), 12px))",
            transform: `translateY(${dragOffset}px)`,
            opacity: 1,
          }}
        >
          {title ? <span id={titleId} className="sr-only">{title}</span> : null}
          {description ? <span id={descriptionId} className="sr-only">{description}</span> : null}

          <div
            className="flex cursor-grab justify-center px-4 pt-3 active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="h-1.5 w-10 rounded-full bg-black/15" />
          </div>

          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/5 text-gray-600 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {header ? <div className="shrink-0 px-4 pt-4">{header}</div> : null}

          <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-4", contentClassName)}>
            <div className={cn("flex min-h-full flex-col", bodyClassName)}>{children}</div>
          </div>

          {footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
