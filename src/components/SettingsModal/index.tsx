'use client';

import { useEffect } from 'react';
import { X, Bell, MapPin, Globe, LogOut, User, Wallet as WalletIcon, Ruler } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
    username?: string | null;
    notificationsEnabled: boolean;
    locationEnabled: boolean;
    loadingPermissions: boolean;
    onToggleNotifications: () => void;
    onToggleLocation: () => void;
    onLogout: () => void;
    isLoggingOut: boolean;
    language: string;
    setLanguage: (lang: string) => void;
    units: 'metric' | 'imperial';
    setUnits: (units: 'metric' | 'imperial') => void;
}

export default function SettingsModal({
    isOpen,
    onClose,
    session,
    username,
    notificationsEnabled,
    locationEnabled,
    loadingPermissions,
    onToggleNotifications,
    onToggleLocation,
    onLogout,
    isLoggingOut,
    language,
    setLanguage,
    units,
    setUnits
}: SettingsModalProps) {
    const t = useTranslations();

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="fixed bottom-0 left-0 right-0 bg-[#F4F4F8] rounded-t-[32px] shadow-2xl transform transition-all duration-300 ease-out z-[60]"
                style={{
                    maxHeight: '90vh',
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)'
                }}
            >
                <div className="w-full h-full flex flex-col">
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-4 pb-3">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-2 pb-6 border-b border-white/20">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-[#1C1C1E]">{t('settingsDrawer.settings')}</h2>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center cursor-pointer bg-white/20 backdrop-blur-md border border-white/30 rounded-full transition-all hover:scale-105 active:scale-95"
                            >
                                <X size={20} className="text-[#1C1C1E]" strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-10">
                        {/* Account Section */}
                        <div className="mb-16">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-gradient-to-b from-[#7DD756] to-[#5FB840] rounded-full"></div>
                                <h3 className="text-xl font-bold text-[#1C1C1E]">{t('walletTab.account')}</h3>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-sm p-3">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-6 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-colors">
                                        <div className="w-14 h-14 bg-gradient-to-br from-[#7DD756] to-[#5FB840] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <User size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600 mb-1">{t('settingsDrawer.username')}</p>
                                            <p className="text-lg font-semibold text-[#1C1C1E] truncate">
                                                {username || session?.user?.username || t('settingsDrawer.notSet')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-6 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-colors">
                                        <div className="w-14 h-14 bg-gradient-to-br from-[#7DD756] to-[#5FB840] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <WalletIcon size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600 mb-1">{t('walletTab.walletAddress')}</p>
                                            <p className="text-lg font-mono font-semibold text-[#1C1C1E] truncate">
                                                {session?.user?.walletAddress ?
                                                    `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}`
                                                    : t('walletTab.notConnected')
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preferences Section */}
                        <div className="mb-16">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-gradient-to-b from-[#7DD756] to-[#5FB840] rounded-full"></div>
                                <h3 className="text-xl font-bold text-[#1C1C1E]">{t('settingsDrawer.preferences')}</h3>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-sm divide-y divide-white/20">
                                {/* Notifications */}
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center">
                                            <Bell size={22} className="text-[#1C1C1E]" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-[#1C1C1E]">{t('settingsDrawer.notifications')}</p>
                                            <p className="text-sm text-gray-600">{t('settingsDrawer.notificationsDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onToggleNotifications}
                                        disabled={loadingPermissions}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ease-in-out ${
                                            notificationsEnabled ? 'bg-[#7DD756] shadow-lg shadow-green-500/25' : 'bg-gray-200'
                                        } ${loadingPermissions ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-95'} transform transition-transform`}
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                                                notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                                            } ${loadingPermissions ? '' : 'hover:shadow-lg'}`}
                                        />
                                    </button>
                                </div>

                                {/* Location Services */}
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center">
                                            <MapPin size={22} className="text-[#1C1C1E]" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-[#1C1C1E]">{t('settingsDrawer.locationServices')}</p>
                                            <p className="text-sm text-gray-600">{t('settingsDrawer.locationServicesDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onToggleLocation}
                                        disabled={locationEnabled}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ease-in-out ${
                                            locationEnabled ? 'bg-[#7DD756] shadow-lg shadow-green-500/25' : 'bg-gray-200'
                                        } ${locationEnabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:shadow-md active:scale-95'} transform transition-transform`}
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span
                                            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out ${
                                                locationEnabled ? 'translate-x-7' : 'translate-x-1'
                                            } ${locationEnabled ? '' : 'hover:shadow-lg'}`}
                                        />
                                    </button>
                                </div>

                                {/* Language */}
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center">
                                            <Globe size={22} className="text-[#1C1C1E]" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-[#1C1C1E]">{t('settingsDrawer.language')}</p>
                                            <p className="text-sm text-gray-600">{t('settingsDrawer.languageDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'en'
                                                    ? 'bg-gradient-to-br from-[#7DD756] to-[#5FB840] text-white shadow-lg scale-[1.02]'
                                                    : 'bg-white/20 backdrop-blur-md border border-white/30 text-[#1C1C1E] hover:bg-white/30'
                                            }`}
                                        >
                                            <span className="text-2xl">🇺🇸</span>
                                            <span className="text-base font-semibold">{t('settings.english')}</span>
                                        </button>
                                        <button
                                            onClick={() => setLanguage('es-AR')}
                                            className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'es-AR'
                                                    ? 'bg-gradient-to-br from-[#7DD756] to-[#5FB840] text-white shadow-lg scale-[1.02]'
                                                    : 'bg-white/20 backdrop-blur-md border border-white/30 text-[#1C1C1E] hover:bg-white/30'
                                            }`}
                                        >
                                            <span className="text-2xl">🇦🇷</span>
                                            <span className="text-base font-semibold">{t('settings.spanish')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Units Section */}
                        <div className="mb-16">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-gradient-to-b from-[#7DD756] to-[#5FB840] rounded-full"></div>
                                <h3 className="text-xl font-bold text-[#1C1C1E]">{t('settingsDrawer.units')}</h3>
                            </div>
                            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-sm p-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl flex items-center justify-center">
                                        <Ruler size={22} className="text-[#1C1C1E]" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-[#1C1C1E]">{t('settingsDrawer.unitSystem')}</p>
                                        <p className="text-sm text-gray-600">{t('settingsDrawer.unitSystemDesc')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setUnits('metric')}
                                        className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                            units === 'metric'
                                                ? 'bg-gradient-to-br from-[#7DD756] to-[#5FB840] text-white shadow-lg scale-[1.02]'
                                                : 'bg-white/20 backdrop-blur-md border border-white/30 text-[#1C1C1E] hover:bg-white/30'
                                        }`}
                                    >
                                        <span className="text-2xl">📏</span>
                                        <span className="text-base font-semibold">{t('settingsDrawer.metric')}</span>
                                    </button>
                                    <button
                                        onClick={() => setUnits('imperial')}
                                        className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                            units === 'imperial'
                                                ? 'bg-gradient-to-br from-[#7DD756] to-[#5FB840] text-white shadow-lg scale-[1.02]'
                                                : 'bg-white/20 backdrop-blur-md border border-white/30 text-[#1C1C1E] hover:bg-white/30'
                                        }`}
                                    >
                                        <span className="text-2xl">🇺🇸</span>
                                        <span className="text-base font-semibold">{t('settingsDrawer.imperial')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sign Out Button */}
                        <div className="pt-8 pb-10">
                            <button
                                onClick={onLogout}
                                disabled={isLoggingOut}
                                className="w-full py-5 flex items-center justify-center gap-3 bg-white/20 backdrop-blur-md border border-white/30 text-[#1C1C1E] hover:bg-white/30 active:bg-white/40 active:scale-[0.98] transition-all duration-200 rounded-2xl font-semibold shadow-sm disabled:opacity-50"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        <span>{t('walletTab.signingOut')}</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut size={22} />
                                        <span>{t('walletTab.signOut')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}