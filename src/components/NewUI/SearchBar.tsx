"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { useTranslations } from "next-intl"

interface SearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  className?: string
}

export function SearchBar({ searchQuery, onSearchChange, className = "" }: SearchBarProps) {
  const t = useTranslations()
  const [isExpanded, setIsExpanded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      // Focus immediately without delay to trigger keyboard
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && 
          searchContainerRef.current && 
          !searchContainerRef.current.contains(event.target as Node)) {
        handleCollapse()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        handleCollapse()
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when search is expanded
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isExpanded])

  const handleExpand = () => {
    setIsExpanded(true)
    // Focus immediately after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        // Try to trigger keyboard on mobile
        inputRef.current.click()
      }
    }, 0)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  const handleClear = () => {
    onSearchChange('')
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-sm z-30 transition-opacity duration-300 ease-out"
          style={{ opacity: isExpanded ? 1 : 0 }}
        />
      )}

      {/* Search Bar Container */}
      <div 
        ref={searchContainerRef}
        className={`relative z-40 transition-all duration-300 ease-out ${className}`}
        style={{
          width: isExpanded ? '100%' : '40px',
          height: '40px'
        }}
      >
         {/* Search Button/Input */}
         <div 
           className={`
             absolute inset-0 flex items-center transition-all duration-300 ease-out cursor-pointer
             ${isExpanded 
               ? 'bg-gray-50 border border-gray-200' 
               : ''
             }
           `}
           style={{
             borderRadius: isExpanded ? 'var(--radius-lg)' : '50%',
             boxShadow: isExpanded ? 'var(--shadow-sm)' : 'none'
           }}
           onClick={() => {
             if (!isExpanded) {
               setIsExpanded(true)
               setTimeout(() => {
                 inputRef.current?.focus()
               }, 50)
             }
           }}
         >
           <div className="flex items-center w-full" style={{ paddingLeft: isExpanded ? '16px' : '0', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px' }}>
             <Search className={`w-4 h-4 flex-shrink-0 transition-colors ${
               isExpanded ? 'text-gray-400' : 'text-gray-600'
             }`} style={{ marginRight: isExpanded ? '12px' : '0' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder={isExpanded ? t('homeTab.searchPlaceholder') : ''}
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => !isExpanded && setIsExpanded(true)}
              className="bg-transparent text-gray-900 placeholder-gray-400 outline-none text-sm"
              style={{ 
                fontSize: '14px',
                opacity: isExpanded ? 1 : 0,
                pointerEvents: isExpanded ? 'auto' : 'none',
                width: isExpanded ? '100%' : '0',
                marginRight: isExpanded && searchQuery ? '8px' : '0'
              }}
            />
            {isExpanded && searchQuery && (
              <button
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                style={{ marginLeft: '8px' }}
              >
                <X size={16} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}