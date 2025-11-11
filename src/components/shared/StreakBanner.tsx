'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface StreakBannerProps {
    dayStreak: number;
}

export function StreakBanner({ dayStreak }: StreakBannerProps) {
    const t = useTranslations();
    const bannerRef = useRef<HTMLDivElement>(null);
    const [animationDelay, setAnimationDelay] = useState(0);

    useEffect(() => {
        // Synchronize animation across tabs using localStorage
        const syncAnimation = () => {
            const now = Date.now();
            const storedData = localStorage.getItem('streakBannerSync');
            
            if (storedData) {
                const { startTime } = JSON.parse(storedData);
                // Calculate how far into the 20-second animation cycle we are
                const elapsed = (now - startTime) % 20000;
                // Set negative delay to continue from current position
                setAnimationDelay(-elapsed);
            } else {
                // First tab - set the start time
                localStorage.setItem('streakBannerSync', JSON.stringify({ startTime: now }));
                setAnimationDelay(0);
            }
        };

        syncAnimation();

        // Listen for changes from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'streakBannerSync') {
                syncAnimation();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Update timestamp periodically to keep sync alive
        const interval = setInterval(() => {
            const now = Date.now();
            localStorage.setItem('streakBannerSync', JSON.stringify({ 
                startTime: now - (animationDelay || 0) 
            }));
        }, 5000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [animationDelay]);

    return (
        <div className="bg-gradient-to-r from-[#7DD756] to-[#6BC647] overflow-hidden shadow-sm">
            <div 
                ref={bannerRef}
                className="flex whitespace-nowrap py-2"
                style={{
                    animation: `scroll-left 20s linear infinite`,
                    animationDelay: `${animationDelay}ms`
                }}
            >
                {/* Duplicate content for seamless looping */}
                {[...Array(20)].map((_, i) => (
                    <span key={i} className="text-white uppercase mx-8 tracking-wide text-lg flex-shrink-0">
                        🔥 {dayStreak} {t('walletTab.dayStreak')}!
                    </span>
                ))}
            </div>
            <style jsx>{`
                @keyframes scroll-left {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
                    }
                }
            `}</style>
        </div>
    );
}

