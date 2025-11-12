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
                className="fixed bottom-0 left-0 right-0 bg-black rounded-t-[32px] shadow-2xl transform transition-all duration-300 ease-out z-[60]"
                style={{
                    maxHeight: '90vh',
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)'
                }}
            >
                <div className="w-full h-full flex flex-col">
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-4 pb-3">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-2 pb-6 border-b border-gray-800">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">{t('settingsDrawer.settings')}</h2>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center cursor-pointer bg-gray-900 border border-gray-800 rounded-full transition-all hover:bg-gray-800 active:scale-95"
                            >
                                <X size={20} className="text-white" strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-8">
                        {/* Account Section */}
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-white rounded-full"></div>
                                <h3 className="text-lg font-semibold text-white">{t('walletTab.account')}</h3>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-4 p-5 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-800 transition-colors">
                                    <div className="w-12 h-12 bg-black border border-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <User size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-400 mb-1">{t('settingsDrawer.username')}</p>
                                        <p className="text-base font-semibold text-white truncate">
                                            {username || session?.user?.username || t('settingsDrawer.notSet')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:bg-gray-800 transition-colors">
                                    <div className="w-12 h-12 bg-black border border-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <WalletIcon size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-400 mb-1">{t('walletTab.walletAddress')}</p>
                                        <p className="text-base font-mono font-semibold text-white truncate">
                                            {session?.user?.walletAddress ?
                                                `${session.user.walletAddress.slice(0, 6)}...${session.user.walletAddress.slice(-4)}`
                                                : t('walletTab.notConnected')
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preferences Section */}
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-white rounded-full"></div>
                                <h3 className="text-lg font-semibold text-white">{t('settingsDrawer.preferences')}</h3>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
                                {/* Notifications */}
                                <div className="flex items-center justify-between p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
                                            <Bell size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white">{t('settingsDrawer.notifications')}</p>
                                            <p className="text-sm text-gray-400">{t('settingsDrawer.notificationsDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onToggleNotifications}
                                        disabled={loadingPermissions}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ease-in-out ${
                                            notificationsEnabled ? 'bg-white' : 'bg-gray-700'
                                        } ${loadingPermissions ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80 active:scale-95'} transform transition-transform`}
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-black shadow-md transition-all duration-300 ease-in-out ${
                                                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Location Services */}
                                <div className="flex items-center justify-between p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
                                            <MapPin size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white">{t('settingsDrawer.locationServices')}</p>
                                            <p className="text-sm text-gray-400">{t('settingsDrawer.locationServicesDesc')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onToggleLocation}
                                        disabled={locationEnabled}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ease-in-out ${
                                            locationEnabled ? 'bg-white' : 'bg-gray-700'
                                        } ${locationEnabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:opacity-80 active:scale-95'} transform transition-transform`}
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-black shadow-md transition-all duration-300 ease-in-out ${
                                                locationEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Language */}
                                <div className="p-5">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-11 h-11 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
                                            <Globe size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white">{t('settingsDrawer.language')}</p>
                                            <p className="text-sm text-gray-400">{t('settingsDrawer.languageDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'en'
                                                    ? 'bg-white text-black border-2 border-white shadow-lg'
                                                    : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <span className="text-xl">🇺🇸</span>
                                            <span className="text-sm font-semibold">{t('settings.english')}</span>
                                        </button>
                                        <button
                                            onClick={() => setLanguage('es-AR')}
                                            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'es-AR'
                                                    ? 'bg-white text-black border-2 border-white shadow-lg'
                                                    : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <span className="text-xl">🇦🇷</span>
                                            <span className="text-sm font-semibold">{t('settings.spanish')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Units Section */}
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-white rounded-full"></div>
                                <h3 className="text-lg font-semibold text-white">{t('settingsDrawer.units')}</h3>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-11 h-11 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center">
                                        <Ruler size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-white">{t('settingsDrawer.unitSystem')}</p>
                                        <p className="text-sm text-gray-400">{t('settingsDrawer.unitSystemDesc')}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setUnits('metric')}
                                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl transition-all duration-200 font-medium ${
                                            units === 'metric'
                                                ? 'bg-white text-black border-2 border-white shadow-lg'
                                                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-750 hover:border-gray-600'
                                        }`}
                                    >
                                        <span className="text-xl">📏</span>
                                        <span className="text-sm font-semibold">{t('settingsDrawer.metric')}</span>
                                    </button>
                                    <button
                                        onClick={() => setUnits('imperial')}
                                        className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl transition-all duration-200 font-medium ${
                                            units === 'imperial'
                                                ? 'bg-white text-black border-2 border-white shadow-lg'
                                                : 'bg-gray-800 border border-gray-700 text-white hover:bg-gray-750 hover:border-gray-600'
                                        }`}
                                    >
                                        <span className="text-xl">🇺🇸</span>
                                        <span className="text-sm font-semibold">{t('settingsDrawer.imperial')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sign Out Button */}
                        <div className="pt-6 pb-8">
                            <button
                                onClick={onLogout}
                                disabled={isLoggingOut}
                                className="w-full py-4 flex items-center justify-center gap-3 bg-gray-900 border border-gray-800 text-white hover:bg-gray-800 active:bg-gray-700 active:scale-[0.98] transition-all duration-200 rounded-xl font-semibold disabled:opacity-50"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{t('walletTab.signingOut')}</span>
                                    </>
                                ) : (
                                    <>
                                        <LogOut size={20} />
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