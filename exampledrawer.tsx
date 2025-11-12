'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';

interface BottomDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children?: React.ReactNode;
    storeData?: {
        name: string;
        rating?: number;
        priceLevel?: number;
        vicinity?: string;
        photos?: any[];
        place_id?: string;
        types?: string[];
        geometry?: {
            location: {
                lat: number | (() => number);
                lng: number | (() => number);
            };
        };
    };
    onEnterPrice?: (storeData: any) => void;
}

export default function BottomDrawer({ isOpen, onClose, title, children, storeData, onEnterPrice }: BottomDrawerProps) {
    const { t } = useLanguage();
    const drawerRef = useRef<HTMLDivElement>(null);

    // Helper function to get the correct emoji icon based on store type
    const getStoreIcon = (store: any) => {
        if (store?.types?.includes('gas_station')) {
            return '⛽';
        }
        return '🛒';
    };

    // Handle Google Maps navigation
    const handleGoogleMaps = () => {
        if (storeData?.geometry?.location) {
            // Handle both function-style (Google API) and property-style (converted data)
            const lat = typeof storeData.geometry.location.lat === 'function'
                ? storeData.geometry.location.lat()
                : storeData.geometry.location.lat;
            const lng = typeof storeData.geometry.location.lng === 'function'
                ? storeData.geometry.location.lng()
                : storeData.geometry.location.lng;

            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (isMobile) {
                // For mobile, try to open in native maps app first
                const mapsUrl = `maps://maps.google.com/maps?daddr=${lat},${lng}`;
                const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

                // Try to open in native app, fallback to web
                window.location.href = mapsUrl;
                setTimeout(() => {
                    window.open(fallbackUrl, '_blank');
                }, 1000);
            } else {
                // For desktop, open in new tab
                const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                window.open(url, '_blank');
            }
        }
    };

    // Handle Enter Price action
    const handleEnterPrice = () => {
        if (onEnterPrice && storeData) {
            // Close the drawer first
            onClose();
            // Trigger store selection with the same data structure as store cards
            onEnterPrice(storeData);
        }
    };

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Handle swipe down to close with smooth animation
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const startY = touch.clientY;
        const startTime = Date.now();
        let isDragging = false;

        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            const currentY = touch.clientY;
            const deltaY = currentY - startY;
            const currentTime = Date.now();
            const deltaTime = currentTime - startTime;

            // Start dragging if moved more than 10px
            if (Math.abs(deltaY) > 10) {
                isDragging = true;
            }

            // If swiping down fast enough, close the drawer with animation
            if (deltaY > 80 && deltaTime < 400 && isDragging) {
                onClose();
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            }
        };

        const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    };

    return (
        <>
            {/* Backdrop/Scrim */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-500 ease-out"
                style={{
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-500 ease-out"
                style={{
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
                    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                    opacity: isOpen ? 1 : 0
                }}
                onTouchStart={handleTouchStart}
            >
                <div 
                    className="bg-white rounded-t-3xl shadow-lg mx-4 mb-4 transition-transform duration-500 ease-out"
                    style={{ 
                        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
                        transform: isOpen ? 'scale(1)' : 'scale(0.95)'
                    }}
                >
                    {/* Handle bar */}
                    <div className="flex justify-center pt-3 pb-2">
                        <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {/* Content */}
                    <div className="px-6 pt-2 pb-6">
                        {/* Title with icon */}
                        <div className="flex items-center space-x-3 mb-5">
                            <div className="w-12 h-12 bg-[var(--valor-green)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">{getStoreIcon(storeData)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-[#1C1C1E] jersey-20-regular truncate">
                                    {title}
                                </h2>
                                {storeData?.vicinity && (
                                    <p className="text-xs text-gray-500 font-dm-sans truncate mt-0.5">{storeData.vicinity}</p>
                                )}
                            </div>
                        </div>

                        {/* Last Known Price */}
                        {storeData?.types?.includes('gas_station') && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-[var(--valor-green)]/10 to-green-100/50 rounded-xl border border-[var(--valor-green)]/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 font-dm-sans font-medium">Last known price</span>
                                    <span className="text-2xl font-bold text-[var(--valor-green)] jersey-20-regular">$3.89</span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-500 font-dm-sans">Updated 2 hours ago</p>
                                    <span className="text-xs text-gray-500 font-dm-sans">/gal</span>
                                </div>
                            </div>
                        )}

                        {/* Custom content */}
                        {children && (
                            <div className="mb-4">
                                {children}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={handleGoogleMaps}
                                className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105 flex items-center justify-center flex-shrink-0 shadow-sm"
                            >
                                <span className="text-2xl">📍</span>
                            </button>
                            <button
                                onClick={handleEnterPrice}
                                className="flex-1 bg-[var(--valor-green)] text-white font-semibold text-base py-4 px-6 rounded-xl hover:shadow-lg active:scale-98 transition-all duration-200 shadow-md font-dm-sans"
                            >
                                {storeData?.types?.includes('gas_station') ? t.submitPrices : t.enterPrice}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
