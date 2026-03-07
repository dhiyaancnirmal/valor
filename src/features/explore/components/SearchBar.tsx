"use client"

import { useRef } from "react"
import { Search, X } from "lucide-react"
import { useTranslations } from "next-intl"

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  className?: string
}

export function SearchBar({ searchQuery, onSearchChange, className = "" }: SearchBarProps) {
  const t = useTranslations()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`w-full ${className}`}>
      <div className="flex min-h-12 items-center rounded-2xl border border-black/10 bg-[var(--valor-bg)] px-4 focus-within:border-[var(--valor-green)]">
        <Search className="mr-3 h-4 w-4 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          placeholder={t("homeTab.searchPlaceholder")}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#1C1C1E] outline-none placeholder:text-gray-400"
          style={{ fontSize: "16px" }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("")
              inputRef.current?.focus()
            }}
            className="ml-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 active:scale-95"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
