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
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
    ];

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
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden pointer-events-auto flex flex-col">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileInput}
                        className="hidden"
                    />

            {/* Sticky Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0 z-10 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={currentStep === 'product' ? onClose : prevStep}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{t('drawer.submitPrice')}</h1>
                    <div className="w-10"></div>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-3">
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
                                    className={`flex-1 h-1 mx-2 rounded-full transition-all duration-200 ${
                                        isStepCompleted(step) ? 'bg-[#7DD756]' : 'bg-gray-200'
                                    }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Location Info */}
                <div className="flex items-center space-x-2">
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
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Product Selection Step */}
                {currentStep === 'product' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{t('priceEntry.selectFuelType')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.chooseFuelType')}</p>
                        </div>

                        <div className="space-y-3">
                            {gasProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setSelectedProduct(product.id)}
                                    className={`w-full p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                                        selectedProduct === product.id
                                            ? 'border-[#7DD756] bg-[#7DD756]/5 shadow-lg scale-[1.02]'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                                            selectedProduct === product.id ? 'bg-[#7DD756]' : 'bg-gray-100'
                                        }`}>
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
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{t('priceEntry.enterPrice')}</h3>
                            <p className="text-sm text-gray-600">{t('priceEntry.pricePerGallonLabel')}</p>
                        </div>

                        <div className="bg-gradient-to-br from-[#FF6B35]/5 via-[#F7931E]/5 to-[#FFD23F]/5 rounded-3xl p-8 border-2 border-[#FF6B35]/20 shadow-xl">
                            <div className="flex justify-center mb-8">
                                <div className="inline-flex bg-white rounded-2xl px-3 py-2 shadow-md border border-gray-200 gap-3">
                                    {currencies.map((curr) => (
                                        <button
                                            key={curr.code}
                                            onClick={() => setCurrency(curr.code)}
                                            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 ${
                                                currency === curr.code
                                                    ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-lg'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="text-lg">{curr.symbol}</span>
                                            <span className="ml-2 text-sm">{curr.code}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <div className="flex items-center justify-center space-x-4 mb-4">
                                    <span className="text-6xl font-bold text-gray-300">
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-40 text-7xl font-bold text-[#1C1C1E] bg-transparent focus:outline-none text-center border-b-4 border-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
                                        inputMode="decimal"
                                    />
                                </div>
                                <div className="text-xl font-semibold text-gray-600">{t('priceEntry.pricePerGallonLabel')}</div>
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

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-6 py-6 flex-shrink-0 shadow-lg z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
                {currentStep === 'review' ? (
                    <div className="flex gap-3">
                        <button
                            onClick={prevStep}
                            className="flex-1 bg-gray-200 text-gray-700 font-bold py-5 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center hover:bg-gray-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <ArrowLeft size={20} className="mr-2" />
                            <span>BACK</span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit() || isSubmitting}
                            className={`flex-1 font-bold py-5 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center text-lg ${
                                canSubmit() && !isSubmitting
                                    ? 'bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] shadow-xl'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                    {t('priceEntry.submitting')}...
                                </>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <span>{t('drawer.submitPrice')}</span>
                                    <span className="text-2xl">🚀</span>
                                </div>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {currentStep !== 'product' && (
                            <button
                                onClick={prevStep}
                                className="flex-1 bg-gray-200 text-gray-700 font-bold py-6 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center hover:bg-gray-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border-2 border-gray-300"
                            >
                                <ArrowLeft size={24} className="mr-2" />
                                <span>BACK</span>
                            </button>
                        )}
                        <button
                            onClick={nextStep}
                            disabled={
                                (currentStep === 'product' && !canProceedFromProduct()) ||
                                (currentStep === 'price' && !canProceedFromPrice()) ||
                                (currentStep === 'photo' && !canProceedFromPhoto())
                            }
                            className={`${currentStep !== 'product' ? 'flex-1' : 'w-full'} font-bold py-6 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center text-xl tracking-wide ${
                                ((currentStep === 'product' && canProceedFromProduct()) ||
                                 (currentStep === 'price' && canProceedFromPrice()) ||
                                 (currentStep === 'photo' && canProceedFromPhoto()))
                                    ? 'bg-gradient-to-r from-[#FF6B35] via-[#F7931E] to-[#FFD23F] text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] shadow-xl border-2 border-[#FF6B35]'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                            }`}
                        >
                            <span>{t('priceEntry.next')}</span>
                            <ChevronRight size={24} className="ml-3" />
                        </button>
                    </div>
                )}
            </div>
                </div>
            </div>
        </>
    );
}

