"use client"

import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

interface StickyActionBarProps extends ComponentPropsWithoutRef<"div"> {
  innerClassName?: string
  keyboardAware?: boolean
}

export function StickyActionBar({
  children,
  className,
  innerClassName,
  keyboardAware = true,
  style,
  ...props
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "border-t border-black/5 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90",
        className
      )}
      style={{
        paddingBottom: keyboardAware
          ? "calc(env(safe-area-inset-bottom, 0px) + var(--spacing-lg) + min(var(--keyboard-offset, 0px), 320px))"
          : "calc(env(safe-area-inset-bottom, 0px) + var(--spacing-lg))",
        ...style,
      }}
      {...props}
    >
      <div className={cn("px-4 pt-3", innerClassName)}>{children}</div>
    </div>
  )
}
