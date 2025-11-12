'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, X, MapPin, Check, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import type { GasStation, UserLocation } from '@/types';

interface PriceEntryPageDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    station: GasStation;
    userLocation: UserLocation | null;
    onSuccess: () => void;
}

type Step = 'product' | 'price' | 'photo' | 'review';

export default function PriceEntryPageDrawer({ isOpen, onClose, station, userLocation, onSuccess }: PriceEntryPageDrawerProps) {
    const { data: session } = useSession();
    const { t } = useTranslation(['priceEntry', 'common']);
    const [currentStep, setCurrentStep] = useState<Step>('product');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const gasProducts = [
        { id: 'Regular', label: t('priceEntry.fuelTypes.regular'), icon: '⛽', description: t('priceEntry.fuelTypes.regularDesc') },
        { id: 'Premium', label: t('priceEntry.fuelTypes.premium'), icon: '⛽', description: t('priceEntry.fuelTypes.premiumDesc') },
        { id: 'Diesel', label: t('priceEntry.fuelTypes.diesel'), icon: '⛽', description: t('priceEntry.fuelTypes.dieselDesc') },
    ];

    const currencies = [
        { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States' },
        { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union' },
        { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom' },
        { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan' },
        { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China' },
        { code: 'AUD', symbol: '$', name: 'Australian Dollar', country: 'Australia' },
        { code: 'CAD', symbol: '$', name: 'Canadian Dollar', country: 'Canada' },
        { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', country: 'Switzerland' },
        { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India' },
        { code: 'MXN', symbol: '$', name: 'Mexican Peso', country: 'Mexico' },
        { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil' },
        { code: 'ARS', symbol: '$', name: 'Argentine Peso', country: 'Argentina' },
        { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea' },
        { code: 'SGD', symbol: '$', name: 'Singapore Dollar', country: 'Singapore' },
        { code: 'NZD', symbol: '$', name: 'New Zealand Dollar', country: 'New Zealand' },
        { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa' },
        { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden' },
        { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway' },
        { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark' },
        { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', country: 'Poland' },
    ];

    // Determine currency based on location
    const getCurrencyFromLocation = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            const countryCode = data.address?.country_code?.toUpperCase();

            // Map country codes to currencies
            const currencyMap: Record<string, string> = {
                'US': 'USD', 'GB': 'GBP', 'JP': 'JPY', 'CN': 'CNY', 'AU': 'AUD',
                'CA': 'CAD', 'CH': 'CHF', 'IN': 'INR', 'MX': 'MXN', 'BR': 'BRL',
                'AR': 'ARS', 'KR': 'KRW', 'SG': 'SGD', 'NZ': 'NZD', 'ZA': 'ZAR',
                'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN',
                // EU countries
                'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
                'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR',
                'GR': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR', 'SK': 'EUR',
                'SI': 'EUR', 'CY': 'EUR', 'MT': 'EUR', 'LU': 'EUR',
            };

            return currencyMap[countryCode] || 'USD';
        } catch (error) {
            console.error('Error fetching location currency:', error);
            return 'USD';
        }
    };

    // Set currency based on location when component opens
    useEffect(() => {
        if (isOpen && userLocation) {
            getCurrencyFromLocation(userLocation.latitude, userLocation.longitude)
                .then(detectedCurrency => setCurrency(detectedCurrency));
        }
    }, [isOpen, userLocation]);

    const canProceedFromProduct = () => selectedProduct !== '';
    const canProceedFromPrice = () => price !== '' && parseFloat(price) > 0;
    const canProceedFromPhoto = () => capturedPhoto !== null;

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    };

    const isWithinAllowedDistance = () => {
        if (!userLocation) return false;
        const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            station.latitude,
            station.longitude
        );
        return distance <= 500; // 500 meters maximum distance
    };

    const canSubmit = () => {
        const baseRequirements = selectedProduct && price && capturedPhoto && userLocation;
        return baseRequirements && isWithinAllowedDistance();
    };

    const nextStep = () => {
        if (currentStep === 'product' && canProceedFromProduct()) setCurrentStep('price');
        else if (currentStep === 'price' && canProceedFromPrice()) setCurrentStep('photo');
        else if (currentStep === 'photo' && canProceedFromPhoto()) setCurrentStep('review');
    };

    const prevStep = () => {
        if (currentStep === 'price') setCurrentStep('product');
        else if (currentStep === 'photo') setCurrentStep('price');
        else if (currentStep === 'review') setCurrentStep('photo');
    };

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setCapturedPhoto(result);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const openNativePicker = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = '0';
        } else {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        }
        
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        };
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        setIsSubmitting(true);

        try {
            // Convert data URL to File
            let photoFile: File | null = null;
            if (capturedPhoto) {
                const response = await fetch(capturedPhoto);
                const blob = await response.blob();
                photoFile = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            }

            const formData = new FormData();
            formData.append("user_wallet_address", session?.user?.walletAddress || "");
            formData.append("gas_station_name", station.name);
            formData.append("gas_station_id", station.id);
            formData.append("price", price);
            formData.append("fuel_type", selectedProduct);
            formData.append("user_latitude", userLocation!.latitude.toString());
            formData.append("user_longitude", userLocation!.longitude.toString());
            formData.append("gas_station_latitude", station.latitude.toString());
            formData.append("gas_station_longitude", station.longitude.toString());
            if (photoFile) {
                formData.append("photo", photoFile);
            }

            const response = await fetch('/api/submit-price', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Submission failed');
            }

            alert(`${t('priceEntry.submissionSuccess')}\n\n${t('priceEntry.submissionPending')}`);

            // Reset form
            setCurrentStep('product');
            setSelectedProduct('');
            setPrice('');
            setCapturedPhoto(null);

            onSuccess();
            onClose();
        } catch (error) {
            console.error('[Submit] ✗ Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`❌ ${t('priceEntry.submissionFailed', { error: errorMessage })}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const getStepNumber = (step: Step) => {
        const steps: Step[] = ['product', 'price', 'photo', 'review'];
        return steps.indexOf(step) + 1;
    };

    const isStepCompleted = (step: Step) => {
        if (step === 'product') return selectedProduct !== '';
        if (step === 'price') return price !== '' && parseFloat(price) > 0;
        if (step === 'photo') return capturedPhoto !== null;
        if (step === 'review') return false;
        return false;
    };

    const isStepActive = (step: Step) => currentStep === step;

    return (
        <>
            {/* Backdrop with blur */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={onClose} />

            {/* Modal Container */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none" style={{ padding: 'var(--spacing-md)' }}>
                <div className="bg-white shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden pointer-events-auto flex flex-col" style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInput}
                        className="hidden"
                    />

            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 flex-shrink-0 z-10" style={{ padding: 'var(--spacing-lg) var(--spacing-xl) var(--spacing-md)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <button
                        onClick={currentStep === 'product' ? onClose : prevStep}
                        className="hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ padding: 'var(--spacing-xs)', borderRadius: 'var(--radius-sm)' }}
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">{t('drawer.submitPrice')}</h1>
                    <div className="w-10"></div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                    {(['product', 'price', 'photo', 'review'] as Step[]).map((step, index) => (
                        <div key={step} className="flex items-center flex-1">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                                    isStepCompleted(step)
                                        ? 'bg-[#7DD756] text-white'
                                        : isStepActive(step)
                                        ? 'bg-[#7DD756] text-white ring-4 ring-[#7DD756]/20'
                                        : 'bg-gray-200 text-gray-500'
                                }`}
                            >
                                {isStepCompleted(step) ? <Check size={16} /> : getStepNumber(step)}
                            </div>
                            {index < 3 && (
                                <div
                                    className={`flex-1 h-1 rounded-full transition-all duration-200 ${
                                        isStepCompleted(step) ? 'bg-[#7DD756]' : 'bg-gray-200'
                                    }`}
                                    style={{ marginLeft: 'var(--spacing-xs)', marginRight: 'var(--spacing-xs)' }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Location Info */}
                <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                    <div className="w-8 h-8 bg-[#7DD756]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">⛽</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-[#1C1C1E] truncate">
                            {station.name}
                        </h2>
                        {station.address && (
                            <p className="text-xs text-gray-500 truncate">{station.address}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}>
                {/* Product Selection Step */}
                {currentStep === 'product' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E]" style={{ marginBottom: 'var(--spacing-xs)' }}>{t('priceEntry.selectFuelType')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.chooseFuelType')}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {gasProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product.id)}
                                    className={`w-full border transition-all duration-200 text-left ${
                                        selectedProduct === product.id
                                            ? 'border-[#7DD756] bg-[#7DD756]/5 scale-[1.02]'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                    style={{
                                        padding: 'var(--spacing-lg)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: selectedProduct === product.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                                    }}
                                >
                                    <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
                                        <div
                                            className={`flex items-center justify-center text-2xl ${
                                                selectedProduct === product.id ? 'bg-[#7DD756]' : 'bg-gray-100'
                                            }`}
                                            style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)' }}
                                        >
                                            {product.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`text-lg font-bold ${
                                                selectedProduct === product.id ? 'text-[#7DD756]' : 'text-[#1C1C1E]'
                                            }`}>
                                                {product.label}
                                            </h4>
                                            <p className="text-sm text-gray-600">{product.description}</p>
                                        </div>
                                        {selectedProduct === product.id && (
                                            <div className="w-8 h-8 bg-[#7DD756] rounded-full flex items-center justify-center">
                                                <Check size={20} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Price Input Step */}
                {currentStep === 'price' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-[#1C1C1E]" style={{ marginBottom: 'var(--spacing-xs)' }}>{t('priceEntry.enterPrice')}</h3>
                                <p className="text-sm text-gray-600">{t('priceEntry.pricePerGallonLabel')}</p>
                            </div>

                            {/* Currency Dropdown */}
                            <div className="relative">
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="appearance-none bg-white border border-gray-300 text-gray-900 font-semibold text-sm focus:outline-none focus:border-[#7DD756] transition-colors cursor-pointer pr-8"
                                    style={{
                                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                                        borderRadius: 'var(--radius-sm)',
                                        minWidth: '100px'
                                    }}
                                >
                                    {currencies.map((curr) => (
                                        <option key={curr.code} value={curr.code}>
                                            {curr.symbol} {curr.code}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-600">
                                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2xl)' }}>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-4" style={{ gap: 'var(--spacing-md)' }}>
                                    <span className="text-5xl font-bold text-gray-300">
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-40 text-6xl font-bold text-[#1C1C1E] bg-transparent focus:outline-none text-center border-b-2 border-gray-300 focus:border-[#7DD756] transition-colors"
                                        inputMode="decimal"
                                    />
                                </div>
                                <div className="text-base font-medium text-gray-600">{t('priceEntry.pricePerGallonLabel')}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Photo Capture Step */}
                {currentStep === 'photo' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{t('priceEntry.takePhoto')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.photoDescription')}</p>
                        </div>

                        {capturedPhoto ? (
                            <div className="relative group">
                                <img
                                    src={capturedPhoto}
                                    alt="Captured price"
                                    className="w-full aspect-[4/3] object-cover rounded-2xl border-2 border-[#7DD756]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <button
                                    onClick={() => setCapturedPhoto(null)}
                                    className="absolute top-4 right-4 w-10 h-10 bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform shadow-lg"
                                >
                                    <X size={20} />
                                </button>
                                <div className="absolute bottom-4 left-4 right-4 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    ✓ {t('priceEntry.photoCaptured')}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={openNativePicker}
                                className="w-full aspect-[4/3] bg-gradient-to-br from-[#7DD756]/5 to-[#7DD756]/10 border-2 border-dashed border-[#7DD756]/30 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 hover:border-[#7DD756] hover:shadow-lg hover:scale-[1.02] active:scale-100"
                            >
                                <div className="w-20 h-20 bg-[#7DD756] rounded-full flex items-center justify-center mb-4 shadow-lg">
                                    <Camera size={40} className="text-white" />
                                </div>
                                <span className="text-[#1C1C1E] font-bold text-lg mb-2">{t('priceEntry.takePhoto')}</span>
                                <span className="text-gray-500 text-sm">{t('priceEntry.capturePriceDisplay')}</span>
                            </button>
                        )}

                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-bold">!</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900 mb-1">{t('priceEntry.photoTips')}</h4>
                                    <ul className="text-xs text-blue-800 space-y-1">
                                        <li>• {t('priceEntry.photoTip1')}</li>
                                        <li>• {t('priceEntry.photoTip3')}</li>
                                        <li>• {t('priceEntry.photoTip2')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Step */}
                {currentStep === 'review' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{t('priceEntry.reviewSubmit')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.confirmDetails')}</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('priceEntry.gasStation')}</h4>
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-[#7DD756]/10 rounded-full flex items-center justify-center">
                                    <span className="text-xl">⛽</span>
                                </div>
                                <div>
                                    <div className="font-bold text-[#1C1C1E]">{station.name}</div>
                                    {station.address && (
                                        <div className="text-sm text-gray-600">{station.address}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('priceEntry.productAndPrice')}</h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-[#1C1C1E] capitalize">
                                        {selectedProduct}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {gasProducts.find(p => p.id === selectedProduct)?.description}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-[#7DD756]">
                                        {currencies.find(c => c.code === currency)?.symbol}{price}
                                    </div>
                                    <div className="text-sm text-gray-600">{t('priceEntry.perGallon')}</div>
                                </div>
                            </div>
                        </div>

                        {capturedPhoto && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('priceEntry.photoEvidence')}</h4>
                                <img
                                    src={capturedPhoto}
                                    alt="Price evidence"
                                    className="w-full aspect-[4/3] object-cover rounded-xl border-2 border-gray-200"
                                />
                            </div>
                        )}

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('priceEntry.locationVerification')}</h4>
                            {userLocation ? (
                                (() => {
                                    const distance = calculateDistance(
                                        userLocation.latitude,
                                        userLocation.longitude,
                                        station.latitude,
                                        station.longitude
                                    );
                                    const isClose = distance <= 500;
                                    return (
                                        <div className={`flex items-center space-x-2 ${isClose ? 'text-[#7DD756]' : 'text-red-600'}`}>
                                            <MapPin size={18} />
                                            <div className="text-sm">
                                                {isClose ? (
                                                    <span className="font-semibold">✓ {t('priceEntry.locationVerified', { distance: Math.round(distance) })}</span>
                                                ) : (
                                                    <span className="font-semibold">✗ {t('priceEntry.tooFarFromStation', { distance: Math.round(distance) })}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm">{t('priceEntry.gettingLocation')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Footer - Fixed width button container */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 flex-shrink-0 z-10" style={{
                padding: 'var(--spacing-xl)',
                paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + var(--spacing-xl))`,
                boxShadow: 'var(--shadow-md)'
            }}>
                {currentStep === 'review' ? (
                    <div className="flex" style={{ gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={prevStep}
                            className="bg-gray-200 text-gray-700 font-semibold transition-all duration-200 flex items-center justify-center hover:bg-gray-300 active:scale-[0.98]"
                            style={{
                                flex: '0 0 100px',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <ArrowLeft size={20} style={{ marginRight: 'var(--spacing-xs)' }} />
                            <span>Back</span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit() || isSubmitting}
                            className={`font-semibold transition-all duration-200 flex items-center justify-center text-base ${
                                canSubmit() && !isSubmitting
                                    ? 'bg-[var(--valor-green)] text-white hover:opacity-90 active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{
                                flex: '1',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: canSubmit() && !isSubmitting ? 'var(--shadow-sm)' : 'none'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" style={{ marginRight: 'var(--spacing-sm)' }}></div>
                                    {t('priceEntry.submitting')}...
                                </>
                            ) : (
                                <span>{t('drawer.submitPrice')}</span>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="flex" style={{ gap: 'var(--spacing-md)' }}>
                        {/* Back button - fixed width to prevent layout shift */}
                        <button
                            onClick={prevStep}
                            className={`bg-gray-200 text-gray-700 font-semibold transition-all duration-200 flex items-center justify-center hover:bg-gray-300 active:scale-[0.98] ${
                                currentStep === 'product' ? 'invisible' : 'visible'
                            }`}
                            style={{
                                flex: '0 0 100px',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)'
                            }}
                        >
                            <ArrowLeft size={20} style={{ marginRight: 'var(--spacing-xs)' }} />
                            <span>Back</span>
                        </button>

                        {/* Next button - always flex 1 */}
                        <button
                            onClick={nextStep}
                            disabled={
                                (currentStep === 'product' && !canProceedFromProduct()) ||
                                (currentStep === 'price' && !canProceedFromPrice()) ||
                                (currentStep === 'photo' && !canProceedFromPhoto())
                            }
                            className={`font-semibold transition-all duration-200 flex items-center justify-center text-base ${
                                ((currentStep === 'product' && canProceedFromProduct()) ||
                                 (currentStep === 'price' && canProceedFromPrice()) ||
                                 (currentStep === 'photo' && canProceedFromPhoto()))
                                    ? 'bg-[var(--valor-green)] text-white hover:opacity-90 active:scale-[0.98]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{
                                flex: '1',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: ((currentStep === 'product' && canProceedFromProduct()) ||
                                           (currentStep === 'price' && canProceedFromPrice()) ||
                                           (currentStep === 'photo' && canProceedFromPhoto()))
                                    ? 'var(--shadow-sm)' : 'none'
                            }}
                        >
                            <span>{t('priceEntry.next')}</span>
                            <ChevronRight size={20} style={{ marginLeft: 'var(--spacing-sm)' }} />
                        </button>
                    </div>
                )}
            </div>
                </div>
            </div>
        </>
    );
}

