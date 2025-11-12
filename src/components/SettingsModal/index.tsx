'use client';

import { useEffect } from 'react';
import { X, Bell, MapPin, Globe, LogOut, User, Wallet as WalletIcon } from 'lucide-react';
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
    setLanguage
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
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl transform transition-all duration-300 ease-out z-[60]"
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
                    <div className="px-6 pt-2 pb-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">{t('settingsDrawer.settings')}</h2>
                            <button
                                onClick={onClose}
                                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 active:scale-95"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-10">
                        {/* Account Section */}
                        <div className="mb-16">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-7 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                                <h3 className="text-xl font-bold text-gray-900">{t('walletTab.account')}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-3">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-6 bg-white rounded-xl hover:bg-gray-50 transition-colors">
                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <User size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500 mb-1">{t('settingsDrawer.username')}</p>
                                            <p className="text-lg font-semibold text-gray-900 truncate">
                                                {username || session?.user?.username || t('settingsDrawer.notSet')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-6 bg-white rounded-xl hover:bg-gray-50 transition-colors">
                                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <WalletIcon size={24} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500 mb-1">{t('walletTab.walletAddress')}</p>
                                            <p className="text-lg font-mono font-semibold text-gray-900 truncate">
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
                                <div className="w-1.5 h-7 bg-gradient-to-b from-green-500 to-green-600 rounded-full"></div>
                                <h3 className="text-xl font-bold text-gray-900">{t('settingsDrawer.preferences')}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
                                {/* Notifications */}
                                <div className="flex items-center justify-between p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <Bell size={22} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">{t('settingsDrawer.notifications')}</p>
                                            <p className="text-sm text-gray-500">{t('settingsDrawer.notificationsDesc')}</p>
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
                                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                                            <MapPin size={22} className="text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">{t('settingsDrawer.locationServices')}</p>
                                            <p className="text-sm text-gray-500">{t('settingsDrawer.locationServicesDesc')}</p>
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
                                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                            <Globe size={22} className="text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-gray-900">{t('settingsDrawer.language')}</p>
                                            <p className="text-sm text-gray-500">{t('settingsDrawer.languageDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setLanguage('en')}
                                            className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'en'
                                                    ? 'bg-gradient-to-br from-[#7DD756] to-[#6BC647] text-white shadow-lg scale-[1.02]'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span className="text-2xl">🇺🇸</span>
                                            <span className="text-base font-semibold">{t('settings.english')}</span>
                                        </button>
                                        <button
                                            onClick={() => setLanguage('es-AR')}
                                            className={`flex items-center justify-center gap-3 py-4 px-4 rounded-xl transition-all duration-200 font-medium ${
                                                language === 'es-AR'
                                                    ? 'bg-gradient-to-br from-[#7DD756] to-[#6BC647] text-white shadow-lg scale-[1.02]'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span className="text-2xl">🇦🇷</span>
                                            <span className="text-base font-semibold">{t('settings.spanish')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sign Out Button */}
                        <div className="pt-8 pb-10">
                            <button
                                onClick={onLogout}
                                disabled={isLoggingOut}
                                className="w-full py-5 flex items-center justify-center gap-3 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 active:scale-[0.98] transition-all duration-200 rounded-2xl font-semibold border-2 border-red-200 shadow-sm disabled:opacity-50"
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