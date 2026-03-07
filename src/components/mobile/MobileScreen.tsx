"use client"

import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MobileScreenProps extends ComponentPropsWithoutRef<"div"> {
  header?: ReactNode
  footer?: ReactNode
  contentClassName?: string
}

export function MobileScreen({
  children,
  className,
  header,
  footer,
  contentClassName,
  ...props
}: MobileScreenProps) {
  return (
    <div
      className={cn(
        "relative flex h-[var(--app-viewport-height,100dvh)] min-h-[var(--app-viewport-height,100dvh)] flex-col overflow-hidden bg-[var(--valor-bg)]",
        className
      )}
      {...props}
    >
      {header ? <div className="relative z-10 shrink-0">{header}</div> : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", contentClassName)}>{children}</div>
      {footer ? <div className="relative z-10 shrink-0">{footer}</div> : null}
    </div>
  )
}
