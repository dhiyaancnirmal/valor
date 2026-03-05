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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  const handleClear = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center w-full bg-[var(--valor-bg)] border border-black/10 rounded-full focus-within:border-[var(--valor-green)] focus-within:ring-2 focus-within:ring-[var(--valor-green)]/20 transition-all">
        <div className="flex items-center w-full px-4 py-2.5">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('homeTab.searchPlaceholder')}
            value={searchQuery}
            onChange={handleInputChange}
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none text-sm font-medium"
            style={{ fontSize: '14px', padding: '0' }}
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
