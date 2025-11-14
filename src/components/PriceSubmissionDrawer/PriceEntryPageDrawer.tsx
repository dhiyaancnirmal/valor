'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, X, MapPin, Check, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import type { GasStation, UserLocation } from '@/types';

interface PriceEntryPageProps {
    station: GasStation;
    userLocation: UserLocation | null;
    onSuccess: () => void;
    onClose?: () => void;
}

type Step = 'product' | 'price' | 'photo' | 'review';

export default function PriceEntryPage({ station, userLocation, onSuccess, onClose }: PriceEntryPageProps) {
    const { data: session } = useSession();
    const t = useTranslations();
    // Always call hooks, but only use them if not in overlay mode
    const router = useRouter();
    const pathname = usePathname();
    const [currentStep, setCurrentStep] = useState<Step>('product');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currency, setCurrency] = useState<string>('USD');
    const [submittedFuelTypes, setSubmittedFuelTypes] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);

    // Calculate font size based on number of digits
    const getFontSize = (value: string) => {
        const digitCount = value.replace(/[^0-9]/g, '').length
        if (digitCount <= 3) return '3.75rem' // 60px
        if (digitCount <= 4) return '3rem' // 48px
        if (digitCount <= 5) return '2.5rem' // 40px
        if (digitCount <= 6) return '2rem' // 32px
        return '1.75rem' // 28px
    }

    const gasProducts = [
        { id: 'Regular', label: t('priceEntry.fuelTypes.regular'), icon: '⛽', description: t('priceEntry.fuelTypes.regularDesc') },
        { id: 'Premium', label: t('priceEntry.fuelTypes.premium'), icon: '⛽', description: t('priceEntry.fuelTypes.premiumDesc') },
        { id: 'Diesel', label: t('priceEntry.fuelTypes.diesel'), icon: '⛽', description: t('priceEntry.fuelTypes.dieselDesc') },
    ];

    const currencies = [
        { code: 'USD', symbol: '$', name: t('currencyInfo.USD.name'), country: t('currencyInfo.USD.country') },
        { code: 'EUR', symbol: '€', name: t('currencyInfo.EUR.name'), country: t('currencyInfo.EUR.country') },
        { code: 'GBP', symbol: '£', name: t('currencyInfo.GBP.name'), country: t('currencyInfo.GBP.country') },
        { code: 'JPY', symbol: '¥', name: t('currencyInfo.JPY.name'), country: t('currencyInfo.JPY.country') },
        { code: 'CNY', symbol: '¥', name: t('currencyInfo.CNY.name'), country: t('currencyInfo.CNY.country') },
        { code: 'AUD', symbol: '$', name: t('currencyInfo.AUD.name'), country: t('currencyInfo.AUD.country') },
        { code: 'CAD', symbol: '$', name: t('currencyInfo.CAD.name'), country: t('currencyInfo.CAD.country') },
        { code: 'CHF', symbol: 'Fr', name: t('currencyInfo.CHF.name'), country: t('currencyInfo.CHF.country') },
        { code: 'INR', symbol: '₹', name: t('currencyInfo.INR.name'), country: t('currencyInfo.INR.country') },
        { code: 'MXN', symbol: '$', name: t('currencyInfo.MXN.name'), country: t('currencyInfo.MXN.country') },
        { code: 'BRL', symbol: 'R$', name: t('currencyInfo.BRL.name'), country: t('currencyInfo.BRL.country') },
        { code: 'ARS', symbol: '$', name: t('currencyInfo.ARS.name'), country: t('currencyInfo.ARS.country') },
        { code: 'KRW', symbol: '₩', name: t('currencyInfo.KRW.name'), country: t('currencyInfo.KRW.country') },
        { code: 'SGD', symbol: '$', name: t('currencyInfo.SGD.name'), country: t('currencyInfo.SGD.country') },
        { code: 'NZD', symbol: '$', name: t('currencyInfo.NZD.name'), country: t('currencyInfo.NZD.country') },
        { code: 'ZAR', symbol: 'R', name: t('currencyInfo.ZAR.name'), country: t('currencyInfo.ZAR.country') },
        { code: 'SEK', symbol: 'kr', name: t('currencyInfo.SEK.name'), country: t('currencyInfo.SEK.country') },
        { code: 'NOK', symbol: 'kr', name: t('currencyInfo.NOK.name'), country: t('currencyInfo.NOK.country') },
        { code: 'DKK', symbol: 'kr', name: t('currencyInfo.DKK.name'), country: t('currencyInfo.DKK.country') },
        { code: 'PLN', symbol: 'zł', name: t('currencyInfo.PLN.name'), country: t('currencyInfo.PLN.country') },
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

    // Fetch user location if not provided
    const [currentUserLocation, setCurrentUserLocation] = useState<UserLocation | null>(userLocation);

    useEffect(() => {
        if (!currentUserLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    setCurrentUserLocation(location);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        }
    }, [currentUserLocation]);

    // Set currency based on location when component mounts
    useEffect(() => {
        if (currentUserLocation) {
            getCurrencyFromLocation(currentUserLocation.latitude, currentUserLocation.longitude)
                .then(detectedCurrency => setCurrency(detectedCurrency));
        }
    }, [currentUserLocation]);

    // Fetch user's submitted fuel types for this station
    useEffect(() => {
        if (session?.user?.walletAddress && station.id) {
            fetch('/api/user-station-submissions')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.stationSubmissions[station.id]) {
                        setSubmittedFuelTypes(data.stationSubmissions[station.id]);
                    }
                })
                .catch(error => {
                    console.error('Error fetching user submissions:', error);
                });
        }
    }, [session?.user?.walletAddress, station.id]);

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
        if (!currentUserLocation) return false;
        const distance = calculateDistance(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            station.latitude,
            station.longitude
        );
        return distance <= 500; // 500 meters maximum distance
    };

    const canSubmit = () => {
        const baseRequirements = selectedProduct && price && capturedPhoto && currentUserLocation;
        const withinDistance = isWithinAllowedDistance();
        const canSubmitResult = baseRequirements && withinDistance;
        
        // Debug logging
        if (currentStep === 'review') {
            console.log('[Submit] Can submit check:', {
                selectedProduct,
                price,
                capturedPhoto: !!capturedPhoto,
                currentUserLocation: !!currentUserLocation,
                withinDistance,
                canSubmit: canSubmitResult
            });
        }
        
        return canSubmitResult;
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

    const handleBack = () => {
        // Close the overlay if onClose is provided, otherwise navigate
        if (onClose) {
            onClose();
        } else if (router && pathname) {
            // Fallback to navigation if used as a page
            const localeMatch = pathname.match(/^\/([^/]+)/);
            const locale = localeMatch ? localeMatch[1] : 'en';
            router.push(`/${locale}`);
        }
    };

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
            formData.append("gas_station_address", station.address || "");
            formData.append("price", price);
            formData.append("fuel_type", selectedProduct);
            formData.append("currency", currency);
            formData.append("user_latitude", currentUserLocation!.latitude.toString());
            formData.append("user_longitude", currentUserLocation!.longitude.toString());
            formData.append("gas_station_latitude", station.latitude.toString());
            formData.append("gas_station_longitude", station.longitude.toString());
            // POI fields from Google Places API
            if (station.placeId) {
                formData.append("poi_place_id", station.placeId);
            }
            if (station.name) {
                formData.append("poi_name", station.name);
            }
            formData.append("poi_lat", station.latitude.toString());
            formData.append("poi_long", station.longitude.toString());
            if (station.types && station.types.length > 0) {
                formData.append("poi_types", JSON.stringify(station.types));
            }
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
            // Close the overlay if onClose is provided, otherwise navigate
            if (onClose) {
                onClose();
            } else if (router && pathname) {
                // Fallback to navigation if used as a page
                const localeMatch = pathname.match(/^\/([^/]+)/);
                const locale = localeMatch ? localeMatch[1] : 'en';
                router.push(`/${locale}`);
            }
        } catch (error) {
            console.error('[Submit] ✗ Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`❌ ${t('priceEntry.submissionFailed', { error: errorMessage })}`);
        } finally {
            setIsSubmitting(false);
        }
    };

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

    // Set cursor to end when input is focused or when step changes to price
    useEffect(() => {
        if (currentStep === 'price' && priceInputRef.current) {
            const input = priceInputRef.current
            const setCursorToEnd = () => {
                setTimeout(() => {
                    if (input && input.type === 'text') {
                        try {
                            input.setSelectionRange(input.value.length, input.value.length)
                        } catch (e) {
                            // Ignore errors if setSelectionRange is not supported
                        }
                    }
                }, 0)
            }
            // Set cursor position immediately when step changes
            setCursorToEnd()
            // Also set it on focus
            input.addEventListener('focus', setCursorToEnd)
            return () => {
                input.removeEventListener('focus', setCursorToEnd)
            }
        }
    }, [currentStep, price])

    return (
        <div className="h-screen bg-[#F4F4F8] flex flex-col overflow-hidden">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
            />

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 flex-shrink-0 z-10" style={{ padding: 'var(--spacing-lg) var(--spacing-xl) var(--spacing-md)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
                    <button
                        onClick={handleBack}
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
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ 
                padding: 'var(--spacing-lg) var(--spacing-xl)', 
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--spacing-xl))',
                minHeight: 0
            }}>
                {/* Product Selection Step */}
                {currentStep === 'product' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E]" style={{ marginBottom: 'var(--spacing-xs)' }}>{t('priceEntry.selectFuelType')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.chooseFuelType')}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {gasProducts.map((product) => {
                                const isSubmitted = submittedFuelTypes.includes(product.id);
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => !isSubmitted && setSelectedProduct(product.id)}
                                        disabled={isSubmitted}
                                        className={`w-full border transition-all duration-200 text-left ${
                                            isSubmitted
                                                ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                                                : selectedProduct === product.id
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
                                                    isSubmitted
                                                        ? 'bg-gray-200'
                                                        : selectedProduct === product.id ? 'bg-[#7DD756]' : 'bg-gray-100'
                                                }`}
                                                style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)' }}
                                            >
                                                {product.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`text-lg font-bold ${
                                                    isSubmitted
                                                        ? 'text-gray-500'
                                                        : selectedProduct === product.id ? 'text-[#7DD756]' : 'text-[#1C1C1E]'
                                                }`}>
                                                    {product.label}
                                                    {isSubmitted && <span className="ml-2 text-sm text-green-600">(Submitted)</span>}
                                                </h4>
                                                <p className="text-sm text-gray-600">{product.description}</p>
                                            </div>
                                            {isSubmitted ? (
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Check size={20} className="text-green-600" />
                                                </div>
                                            ) : selectedProduct === product.id && (
                                                <div className="w-8 h-8 bg-[#7DD756] rounded-full flex items-center justify-center">
                                                    <Check size={20} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
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

                        <div className="bg-gray-50 border border-gray-200" style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2xl)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                            <div className="text-center" style={{ width: '100%', maxWidth: '100%' }}>
                                <div className="flex items-center justify-center mb-4" style={{ gap: 'var(--spacing-md)' }}>
                                    <span className="text-5xl font-bold text-gray-300" style={{ display: 'inline-block', flexShrink: 0 }}>
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </span>
                                    <div style={{ 
                                        width: '200px', 
                                        height: '80px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        flexShrink: 0, 
                                        flexGrow: 0, 
                                        overflow: 'hidden', 
                                        boxSizing: 'border-box' 
                                    }}>
                                        <input
                                            ref={priceInputRef}
                                            type="text"
                                            placeholder="0.00"
                                            value={price}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                // Only allow numbers and decimal point
                                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                    setPrice(value)
                                                    // Keep cursor at end after change
                                                    setTimeout(() => {
                                                        if (priceInputRef.current && priceInputRef.current.type === 'text') {
                                                            const input = priceInputRef.current
                                                            try {
                                                                input.setSelectionRange(input.value.length, input.value.length)
                                                            } catch (e) {
                                                                // Ignore errors if setSelectionRange is not supported
                                                            }
                                                        }
                                                    }, 0)
                                                }
                                            }}
                                            className="w-full font-bold text-[#1C1C1E] bg-transparent focus:outline-none text-right border-b-2 border-gray-300 focus:border-[#7DD756] transition-all"
                                            style={{ 
                                                fontSize: getFontSize(price),
                                                lineHeight: '1',
                                                boxSizing: 'border-box',
                                                padding: 0,
                                                margin: 0
                                            }}
                                            inputMode="decimal"
                                            autoFocus
                                        />
                                    </div>
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
                            {currentUserLocation ? (
                                (() => {
                                    const distance = calculateDistance(
                                        currentUserLocation.latitude,
                                        currentUserLocation.longitude,
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

            {/* Footer - Fixed width button container */}
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
                            <span>{t('common.back')}</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (canSubmit() && !isSubmitting) {
                                    handleSubmit();
                                }
                            }}
                            disabled={!canSubmit() || isSubmitting}
                            className={`font-semibold transition-all duration-200 flex items-center justify-center text-base ${
                                canSubmit() && !isSubmitting
                                    ? 'bg-[var(--valor-green)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer'
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
                            <span>{t('common.back')}</span>
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
    );
}

