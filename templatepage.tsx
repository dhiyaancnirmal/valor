'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { MapPin, Wallet } from 'lucide-react';
import { DailyChallenge, NearbyStationsList, TaskCard } from '@/components/tasks';
import { ProfileButton, StreakBanner } from '@/components/shared';
import { useLanguage } from '@/providers/LanguageProvider';
import LoginPage from '@/components/LoginPage';

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t } = useLanguage();
    const [userProfile, setUserProfile] = useState<{
        username?: string;
        walletAddress?: string;
        profilePictureUrl?: string;
    } | null>(null);
    const [dayStreak] = useState(7); // You can fetch this from your backend
    const [dailyChallenge, setDailyChallenge] = useState<any>(null);
    const [nearbyStations, setNearbyStations] = useState<any[]>([]);
    const [verificationTasks, setVerificationTasks] = useState<any[]>([]);
    const hasFetchedData = useRef(false); // Track if we've already fetched data
    const lastWalletAddress = useRef<string | null>(null); // Track wallet address to detect user changes

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            // Don't redirect - just show login page
            hasFetchedData.current = false; // Reset when logged out
            lastWalletAddress.current = null;
            return;
        }

        const currentWalletAddress = session.user?.walletAddress;

        // Extract user data from session (only update if wallet address changed)
        if (session.user && currentWalletAddress) {
            const newProfile = {
                username: session.user.username || undefined,
                walletAddress: currentWalletAddress,
                profilePictureUrl: session.user.image || session.user.profilePictureUrl || undefined
            };
            
            // Only update if wallet address actually changed (new user logged in)
            if (lastWalletAddress.current !== currentWalletAddress) {
                lastWalletAddress.current = currentWalletAddress;
                setUserProfile(newProfile);
                // Reset fetch flag when new user logs in
                hasFetchedData.current = false;
            }
        }

        // Only fetch task data once per user session
        // Don't refetch on every session refresh (NextAuth refreshes session periodically)
        if (!hasFetchedData.current && session && currentWalletAddress) {
            hasFetchedData.current = true;
            fetchTaskData();
        }
    }, [status, session?.user?.walletAddress]); // Only depend on status and wallet address, not entire session object

    const fetchTaskData = async () => {
        try {
            // Fetch daily challenge
            const challengeResponse = await fetch('/api/tasks/daily-challenge', {
                cache: 'no-store', // Prevent caching
            });
            const challengeData = await challengeResponse.json();
            if (challengeData.success) {
                setDailyChallenge(challengeData.challenge);
            }

            // Fetch nearby stations using user's location
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false, // Less strict for faster response
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutes - use cached location if available
                    });
                });
                
                const { latitude, longitude } = position.coords;
                const stationsResponse = await fetch(`/api/tasks/nearby-stations?lat=${latitude}&lng=${longitude}`, {
                    cache: 'no-store',
                });
                const stationsData = await stationsResponse.json();
                if (stationsData.success) {
                    setNearbyStations(stationsData.stations);
                }
            } catch (locationError) {
                console.warn('Location access denied, using default location:', locationError);
                // Fallback to San Francisco if location is denied
                const stationsResponse = await fetch('/api/tasks/nearby-stations?lat=37.7749&lng=-122.4194', {
                    cache: 'no-store',
                });
                const stationsData = await stationsResponse.json();
                if (stationsData.success) {
                    setNearbyStations(stationsData.stations);
                }
            }

            // Fetch verification tasks
            const verificationResponse = await fetch('/api/tasks/verification-queue', {
                cache: 'no-store',
            });
            const verificationData = await verificationResponse.json();
            if (verificationData.success) {
                setVerificationTasks(verificationData.tasks);
            }
        } catch (error) {
            console.error('Error fetching task data:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#F4F4F8] font-dm-sans flex items-center justify-center">
                <div className="text-center">
                    <div className="border-3 border-solid border-gray-200 border-t-[#333] rounded-full w-10 h-10 animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-dm-sans">{t.loading}</p>
                </div>
            </div>
        );
    }

    if (!session) {
        // Show login page instead of redirecting (prevents infinite loop)
        return <LoginPage />;
    }

    const formatAddress = (address?: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const displayUsername = userProfile?.username || formatAddress(userProfile?.walletAddress);

    const handleProfileClick = () => {
        router.push('/profile');
    };

    const handleStationClick = (station: any) => {
        // Navigate to price entry for this station
        router.push(`/map?station=${station.id}`);
    };

    const handleVerificationClick = (task: any) => {
        // Navigate to verification screen
        router.push(`/verify/${task.id}`);
    };

    const handleDailyChallengeClick = () => {
        // Navigate to map to find stations
        router.push('/map');
    };

    return (
        <div className="min-h-full bg-[#F4F4F8] font-dm-sans">
            {/* Rolling Banner */}
            <StreakBanner dayStreak={dayStreak} />

            {/* Header */}
            <div className="px-6 pt-8 pb-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-[#1C1C1E] jersey-20-regular mb-1">
                            {t.welcomeBack}!
                        </h1>
                        <p className="text-base text-gray-600 font-dm-sans">{displayUsername || 'User'}</p>
                    </div>
                    <ProfileButton
                        profilePictureUrl={userProfile?.profilePictureUrl}
                        onClick={handleProfileClick}
                    />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="text-3xl font-bold text-[var(--valor-green)] mb-1 jersey-20-regular">0</div>
                        <div className="text-sm text-gray-600 font-dm-sans">{t.usdcEarned}</div>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="text-3xl font-bold text-[#1C1C1E] mb-1 jersey-20-regular">0</div>
                        <div className="text-sm text-gray-600 font-dm-sans">{t.submissions}</div>
                    </div>
                </div>
            </div>

            {/* Tasks Section */}
            <div className="px-6 pb-20">
                {/* Daily Challenge */}
                {dailyChallenge && (
                    <div className="mb-3 scrollbar-hide">
                        <DailyChallenge
                            currentProgress={dailyChallenge.currentProgress}
                            targetGoal={dailyChallenge.targetGoal}
                            reward={dailyChallenge.reward}
                            onClick={handleDailyChallengeClick}
                        />
                    </div>
                )}

                {/* Nearby Stations */}
                {nearbyStations.length > 0 && (
                    <div className="mb-3 scrollbar-hide">
                        <NearbyStationsList
                            stations={nearbyStations}
                            onStationClick={handleStationClick}
                        />
                    </div>
                )}

                {/* Verification Tasks */}
                {verificationTasks.length > 0 && (
                    <div className="mb-3 scrollbar-hide">
                        <h2 className="text-2xl font-bold text-[#1C1C1E] jersey-20-regular mb-2">
                            ✅ {t.verificationTask}s
                        </h2>
                        <div className="space-y-2 scrollbar-hide">
                            {verificationTasks.slice(0, 3).map((task) => (
                                <TaskCard
                                    key={task.id}
                                    type="verification"
                                    title={`${t.reviewSubmission} ${task.stationName} submission`}
                                    subtitle={`${t.from} ${task.submittedBy}`}
                                    value={task.verificationReward}
                                    time={task.submittedAt}
                                    onClick={() => handleVerificationClick(task)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div>
                    <h2 className="text-2xl font-bold text-[#1C1C1E] jersey-20-regular mb-4">{t.recentActivity}</h2>
                    <div className="space-y-3">
                        {/* Activity Card 1 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                                        <MapPin size={22} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#1C1C1E] font-dm-sans mb-1">
                                            {t.visitedStation}
                                        </h3>
                                        <p className="text-sm text-gray-500 font-dm-sans">2 {t.hoursAgo}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-[#7DD756] jersey-20-regular">+5</div>
                                    <div className="text-xs text-gray-500 font-dm-sans">USDC</div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Card 2 */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center shadow-sm">
                                        <Wallet size={22} className="text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#1C1C1E] font-dm-sans mb-1">
                                            {t.dailyCheckIn}
                                        </h3>
                                        <p className="text-sm text-gray-500 font-dm-sans">{t.yesterday}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-[#7DD756] jersey-20-regular">+2</div>
                                    <div className="text-xs text-gray-500 font-dm-sans">USDC</div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Card 3 - Bonus */}
                        <div className="bg-gradient-to-br from-[#7DD756]/5 via-[#7DD756]/10 to-[#7DD756]/5 rounded-2xl border-2 border-[#7DD756]/20 p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#7DD756] to-[#6BC647] rounded-2xl flex items-center justify-center shadow-lg">
                                        <span className="text-2xl">🔥</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#1C1C1E] font-dm-sans mb-1">
                                            Weekly Streak Bonus
                                        </h3>
                                        <p className="text-sm text-gray-600 font-dm-sans">7 days in a row!</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-[#7DD756] jersey-20-regular">+10</div>
                                    <div className="text-xs text-gray-500 font-dm-sans">USDC</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}