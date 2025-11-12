'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, X, MapPin, Check, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/providers/LanguageProvider';

interface PriceEntryPageProps {
    isOpen: boolean;
    onClose: () => void;
    storeData: {
        name: string;
        vicinity?: string;
        rating?: number;
        types?: string[];
        place_id?: string;
        geometry?: {
            location: {
                lat: number;
                lng: number;
            };
        };
    };
}

type Step = 'product' | 'price' | 'photo' | 'review';

export default function PriceEntryPage({ isOpen, onClose, storeData }: PriceEntryPageProps) {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [currentStep, setCurrentStep] = useState<'product' | 'price' | 'photo' | 'review'>('product');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [price, setPrice] = useState<string>('');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isLoadingCamera, setIsLoadingCamera] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<string>('ARS');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);



    // Get user's location when modal opens
    useEffect(() => {
        if (!isOpen) {
            // Reset location when modal closes
            setUserLocation(null);
            setLocationError(null);
            return;
        }

        // Only fetch if we don't have location yet
        if (userLocation || locationError) {
            return;
        }

        console.log('[Location] Requesting user location...');
        if ('geolocation' in navigator) {
            // Use a timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                console.warn('[Location] Timeout - location request taking too long');
                setLocationError('Location request timed out');
            }, 15000); // 15 second timeout

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    console.log('[Location] ✓ Location obtained:', location);
                    console.log('[Location] Location received:', location); // Debug log
                    setUserLocation(location);
                    setLocationError(null);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    console.warn('[Location] ✗ Error (non-blocking):', error);
                    // Don't block submission - just log the error
                    setLocationError(error.message);
                    // Allow submission to proceed without location
                },
                { 
                    enableHighAccuracy: false, // Less strict for faster response
                    timeout: 10000, 
                    maximumAge: 300000 // Accept location up to 5 minutes old
                }
            );
        } else {
            console.warn('[Location] Geolocation not supported');
            setLocationError('Geolocation not supported');
        }
    }, [isOpen]); // Only depend on isOpen, not userLocation or locationError

    const isGasStation = storeData?.types?.includes('gas_station');

    const gasProducts = [
        { id: 'regular', label: 'Regular', icon: '⛽', description: 'Standard unleaded' },
        { id: 'premium', label: 'Premium', icon: '⛽', description: 'High octane' },
        { id: 'diesel', label: 'Diesel', icon: '⛽', description: 'Diesel fuel' },
    ];

    const currencies = [
        { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
        { code: 'USD', symbol: '$', name: 'US Dollar' },
        { code: 'EUR', symbol: '€', name: 'Euro' },
        { code: 'GBP', symbol: '£', name: 'British Pound' },
    ];

    // Step navigation
    const canProceedFromProduct = () => selectedProduct !== '';
    const canProceedFromPrice = () => price !== '' && parseFloat(price) > 0;
    const canProceedFromPhoto = () => capturedPhoto !== null;
    // Calculate distance between two coordinates in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        // Validate inputs
        if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
            typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
            isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
            console.error('[Distance] Invalid coordinates:', { lat1, lon1, lat2, lon2 });
            return Infinity; // Return Infinity if invalid
        }

        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distance = R * c; // Distance in meters
        console.log('[Distance] Calculated:', distance, 'm between', { lat1, lon1 }, 'and', { lat2, lon2 });
        return distance;
    };

    const isWithinAllowedDistance = () => {
        if (!userLocation || !storeData.geometry?.location) return true; // Allow if location unavailable
        
        // Helper to extract lat/lng from Google Maps API (can be function or property)
        const getStoreLat = () => {
            const loc = storeData.geometry?.location;
            if (!loc) return null;
            // Handle Google Maps API LatLng object (function-style)
            if (typeof loc.lat === 'function') return loc.lat();
            // Handle plain object (property-style)
            return loc.lat;
        };
        
        const getStoreLng = () => {
            const loc = storeData.geometry?.location;
            if (!loc) return null;
            // Handle Google Maps API LatLng object (function-style)
            if (typeof loc.lng === 'function') return loc.lng();
            // Handle plain object (property-style)
            return loc.lng;
        };

        const storeLat = getStoreLat();
        const storeLng = getStoreLng();

        // If we can't get store coordinates, allow submission
        if (storeLat === null || storeLng === null || 
            typeof storeLat !== 'number' || typeof storeLng !== 'number') {
            console.warn('[Distance] Cannot get store coordinates, allowing submission');
            return true;
        }

        const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            storeLat,
            storeLng
        );

        // If distance calculation fails, allow submission (don't block)
        if (isNaN(distance) || !isFinite(distance)) {
            console.warn('[Distance] Invalid distance calculated, allowing submission');
            return true;
        }

        return distance <= 500; // 500 meters maximum distance (more lenient)
    };

    const canSubmit = () => {
        // Base requirements: product, price, photo, and location are required
        const baseRequirements = selectedProduct && price && capturedPhoto && userLocation;
        // If location is available, check distance
        if (userLocation && storeData.geometry?.location) {
            return baseRequirements && isWithinAllowedDistance();
        }
        // Require location for submission
        return baseRequirements;
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

    // Camera functions
    const openCamera = async () => {
        setIsCameraOpen(true);
        setIsLoadingCamera(true);

        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            console.log('[Camera] Requesting camera access...');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            if (!videoRef.current) {
                console.error('[Camera] Video element not found!');
                stream.getTracks().forEach(track => track.stop());
                setIsLoadingCamera(false);
                setIsCameraOpen(false);
                return;
            }

            streamRef.current = stream;

            stream.getVideoTracks().forEach(track => {
                track.onended = () => {
                    console.error('[Camera] ✗ Video track ended unexpectedly!');
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(t => t.stop());
                        streamRef.current = null;
                    }
                    setIsCameraOpen(false);
                    setIsLoadingCamera(false);
                };
            });

            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.setAttribute('playsinline', '');
            videoRef.current.setAttribute('muted', '');

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for video metadata'));
                }, 5000);

                const onMetadata = () => {
                    clearTimeout(timeout);
                    resolve();
                };

                if (videoRef.current) {
                    if (videoRef.current.readyState >= 1) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        videoRef.current.addEventListener('loadedmetadata', onMetadata, { once: true });
                    }
                }
            });

            if (videoRef.current) {
                try {
                    await videoRef.current.play();
                    setIsLoadingCamera(false);
                } catch (playErr) {
                    console.error('[Camera] ✗ Play error:', playErr);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await videoRef.current.play();
                    setIsLoadingCamera(false);
                }
            }
        } catch (error) {
            console.error('[Camera] Error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('mini_app_permission_not_enabled') ||
                errorMessage.includes('Permission denied') ||
                errorMessage.includes('NotAllowedError')) {
                console.log('[Camera] Permissions blocked - native camera button available');
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
                setIsCameraOpen(false);
                setIsLoadingCamera(false);
                return;
            }

            alert('Camera failed: ' + errorMessage);

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setIsCameraOpen(false);
            setIsLoadingCamera(false);
        }
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedPhoto(photoDataUrl);
                closeCamera();
            }
        }
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
            // Prevent body scrolling when modal is open
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = '0';
        } else {
            // Restore body scrolling when modal is closed
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        }
        
        return () => {
            // Cleanup on unmount
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            closeCamera();
        };
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!canSubmit()) return;

        setIsSubmitting(true);

        try {
            if (!session?.user?.walletAddress) {
                alert('Please log in with your wallet first');
                setIsSubmitting(false);
                return;
            }

            // Simple submission data matching the simplified API
            // Require user location (coordinates only, no metadata)
            if (!userLocation) {
                alert('Location is required. Please allow location access.');
                setIsSubmitting(false);
                return;
            }

            const submissionData = {
                userWalletAddress: session.user.walletAddress,
                gasStationName: storeData.name || 'Unknown Store',
                gasStationId: storeData.place_id || storeData.id || 'unknown',
                price: price,
                fuelType: selectedProduct,
                userLatitude: userLocation.lat,
                userLongitude: userLocation.lng,
                gasStationLatitude: storeData.geometry?.location?.lat,
                gasStationLongitude: storeData.geometry?.location?.lng,
                photoDataUrl: capturedPhoto,
            };

            const response = await fetch('/api/submit-price', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Submission failed');
            }

            console.log('[Submit] ✓ Success:', result);
            
            // Reset form BEFORE closing to prevent any state issues
            setCurrentStep('product');
            setSelectedProduct('');
            setPrice('');
            setCapturedPhoto(null);
            setUserLocation(null);
            setLocationError(null);

            // Close modal without triggering any navigation
            onClose();
            
            // Show success message after a brief delay to ensure modal is closed
            setTimeout(() => {
                alert(`✅ Price submitted successfully!`);
            }, 100);
        } catch (error) {
            console.error('[Submit] ✗ Error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`❌ Submission failed: ${errorMessage}`);
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
        if (step === 'review') return false; // Review is never "completed" until submission
        return false;
    };

    const isStepActive = (step: Step) => currentStep === step;

    return (
        <div className="fixed inset-0 bg-[#F4F4F8] z-[100] flex flex-col overflow-hidden">
            {/* Camera View */}
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black z-[110]">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                    />

                    {isLoadingCamera && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-white font-dm-sans">Starting camera...</p>
                            </div>
                        </div>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex flex-col items-center">
                            {!isLoadingCamera && (
                                <button
                                    onClick={openNativePicker}
                                    className="mb-4 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full text-gray-900 font-dm-sans font-medium text-sm active:scale-95 transition-transform"
                                >
                                    Use Native Camera Instead
                                </button>
                            )}

                            <div className="flex items-center justify-between w-full mb-6">
                                <button
                                    onClick={closeCamera}
                                    className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                                >
                                    <X size={24} />
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    disabled={isLoadingCamera}
                                    className="w-16 h-16 bg-white rounded-full border-4 border-white/50 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                                />
                                <div className="w-12 h-12"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                    <h1 className="text-2xl font-bold text-gray-900 jersey-20-regular">{t.submitPrices}</h1>
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
                        <span className="text-lg">{isGasStation ? '⛽' : '🛒'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-[#1C1C1E] jersey-20-regular truncate">
                            {storeData.name}
                        </h2>
                        {storeData.vicinity && (
                            <p className="text-xs text-gray-500 font-dm-sans truncate">{storeData.vicinity}</p>
                        )}
                    </div>
                    {storeData.rating && (
                        <div className="flex items-center space-x-1 flex-shrink-0">
                            <span className="text-sm">⭐</span>
                            <span className="text-xs font-semibold text-gray-700 font-dm-sans">{storeData.rating}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Product Selection Step */}
                {currentStep === 'product' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] jersey-20-regular mb-2">{t.selectProduct}</h3>
                            <p className="text-sm text-gray-600 font-dm-sans">Choose the fuel type you're pricing</p>
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
                                            <h4 className={`text-lg font-bold jersey-20-regular ${
                                                selectedProduct === product.id ? 'text-[#7DD756]' : 'text-[#1C1C1E]'
                                            }`}>
                                                {product.label}
                                            </h4>
                                            <p className="text-sm text-gray-600 font-dm-sans">{product.description}</p>
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
                            <h3 className="text-xl font-bold text-[#1C1C1E] jersey-20-regular mb-2">{t.enterPrice}</h3>
                            <p className="text-sm text-gray-600 font-dm-sans">Input the current price per gallon</p>
                        </div>

                        {/* Price Input with Currency Selector */}
                        <div className="bg-gradient-to-br from-[#FF6B35]/5 via-[#F7931E]/5 to-[#FFD23F]/5 rounded-3xl p-8 border-2 border-[#FF6B35]/20 shadow-xl">
                            {/* Currency Selector - Improved Design */}
                            <div className="flex justify-center mb-8">
                                <div className="inline-flex bg-white rounded-2xl p-1 shadow-md border border-gray-200">
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
                            
                            {/* Price Input */}
                            <div className="text-center">
                                <div className="flex items-center justify-center space-x-4 mb-4">
                                    <span className="text-6xl font-bold text-gray-300 jersey-20-regular">
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-40 text-7xl font-bold text-[#1C1C1E] bg-transparent focus:outline-none jersey-20-regular text-center border-b-4 border-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
                                        inputMode="decimal"
                                    />
                                </div>
                                <div className="text-xl font-semibold text-gray-600 font-dm-sans">per gallon</div>
                            </div>
                        </div>
                            
                            {/* Price Input */}
                            <div className="text-center">
                                <div className="flex items-center justify-center space-x-4 mb-4">
                                    <span className="text-6xl font-bold text-gray-300 jersey-20-regular">
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-40 text-7xl font-bold text-[#1C1C1E] bg-transparent focus:outline-none jersey-20-regular text-center border-b-4 border-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
                                        inputMode="decimal"
                                    />
                                </div>
                                <div className="text-xl font-semibold text-gray-600 font-dm-sans">per gallon</div>
                            </div>
                        </div>
                )}

                {/* Photo Capture Step */}
                {currentStep === 'photo' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#1C1C1E] jersey-20-regular mb-2">{t.takePhoto}</h3>
                            <p className="text-sm text-gray-600 font-dm-sans">Take a clear photo of the price display</p>
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
                                <div className="absolute bottom-4 left-4 right-4 text-white text-sm font-dm-sans font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    ✓ Photo captured successfully
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
                                <span className="text-[#1C1C1E] font-bold text-lg font-dm-sans mb-2">{t.takePhoto}</span>
                                <span className="text-gray-500 font-dm-sans text-sm">Capture the price display clearly</span>
                            </button>
                        )}

                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-bold">!</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-900 font-dm-sans mb-1">Photo Tips</h4>
                                    <ul className="text-xs text-blue-800 font-dm-sans space-y-1">
                                        <li>• Ensure prices are clearly visible</li>
                                        <li>• Include the fuel type labels</li>
                                        <li>• Avoid glare and blurry images</li>
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
                            <h3 className="text-xl font-bold text-[#1C1C1E] jersey-20-regular mb-2">Review Submission</h3>
                            <p className="text-sm text-gray-600 font-dm-sans">Confirm all details before submitting</p>
                        </div>

                        {/* Store Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 font-dm-sans mb-3">{t.nearbyStations}</h4>
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-[#7DD756]/10 rounded-full flex items-center justify-center">
                                    <span className="text-xl">{isGasStation ? '⛽' : '🛒'}</span>
                                </div>
                                <div>
                                    <div className="font-bold text-[#1C1C1E] jersey-20-regular">{storeData.name}</div>
                                    {storeData.vicinity && (
                                        <div className="text-sm text-gray-600 font-dm-sans">{storeData.vicinity}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Product & Price */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 font-dm-sans mb-3">Product & Price</h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-[#1C1C1E] jersey-20-regular capitalize">
                                        {selectedProduct}
                                    </div>
                                    <div className="text-sm text-gray-600 font-dm-sans">
                                        {gasProducts.find(p => p.id === selectedProduct)?.description}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-[#7DD756] jersey-20-regular">
                                        {currencies.find(c => c.code === currency)?.symbol}{price}
                                    </div>
                                    <div className="text-sm text-gray-600 font-dm-sans">per gallon</div>
                                </div>
                            </div>
                        </div>

                        {/* Photo Preview */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 font-dm-sans mb-3">Photo Evidence</h4>
                            <img
                                src={capturedPhoto!}
                                alt="Price evidence"
                                className="w-full aspect-[4/3] object-cover rounded-xl border-2 border-gray-200"
                            />
                        </div>

                        {/* Location Status */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 font-dm-sans mb-3">Location Verification</h4>
                            {locationError ? (
                                <div className="flex items-center space-x-2 text-red-600">
                                    <MapPin size={18} />
                                    <div className="text-sm font-dm-sans">
                                        <span className="font-semibold">⚠ Location unavailable - {locationError}</span>
                                    </div>
                                </div>
                            ) : userLocation ? (
                                (() => {
                                    // Helper to extract lat/lng from Google Maps API (can be function or property)
                                    const getStoreLat = () => {
                                        const loc = storeData.geometry?.location;
                                        if (!loc) return null;
                                        // Handle Google Maps API LatLng object (function-style)
                                        if (typeof loc.lat === 'function') return loc.lat();
                                        // Handle plain object (property-style)
                                        return loc.lat;
                                    };
                                    
                                    const getStoreLng = () => {
                                        const loc = storeData.geometry?.location;
                                        if (!loc) return null;
                                        // Handle Google Maps API LatLng object (function-style)
                                        if (typeof loc.lng === 'function') return loc.lng();
                                        // Handle plain object (property-style)
                                        return loc.lng;
                                    };

                                    const storeLat = getStoreLat();
                                    const storeLng = getStoreLng();

                                    console.log('[Location] User location:', userLocation);
                                    console.log('[Location] Store location:', { lat: storeLat, lng: storeLng });
                                    console.log('[Location] Store data geometry:', storeData.geometry);

                                    // If we have store location, calculate distance
                                    if (storeLat !== null && storeLng !== null && 
                                        typeof storeLat === 'number' && typeof storeLng === 'number') {
                                        const distance = calculateDistance(
                                            userLocation.lat,
                                            userLocation.lng,
                                            storeLat,
                                            storeLng
                                        );
                                        
                                        // Check if distance is valid
                                        if (isNaN(distance) || !isFinite(distance)) {
                                            console.error('[Location] Invalid distance calculated:', distance);
                                            return (
                                                <div className="flex items-center space-x-2 text-orange-600">
                                                    <CheckCircle2 size={20} className="text-orange-600" />
                                                    <div className="text-sm font-dm-sans">
                                                        <span className="font-semibold">✓ Location retrieved</span>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            User: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Store: {storeLat.toFixed(6)}, {storeLng.toFixed(6)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const isClose = distance <= 500;
                                        return (
                                            <div className={`flex items-center space-x-2 ${isClose ? 'text-[#7DD756]' : 'text-orange-600'}`}>
                                                <CheckCircle2 size={20} className={isClose ? 'text-[#7DD756]' : 'text-orange-600'} />
                                                <div className="text-sm font-dm-sans">
                                                    {isClose ? (
                                                        <span className="font-semibold">✓ Location verified ({Math.round(distance)}m away)</span>
                                                    ) : (
                                                        <span className="font-semibold">⚠ {Math.round(distance)}m away (outside 500m range)</span>
                                                    )}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        User: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // Location received but no store location to compare
                                        return (
                                            <div className="flex items-center space-x-2 text-[#7DD756]">
                                                <CheckCircle2 size={20} className="text-[#7DD756]" />
                                                <div className="text-sm font-dm-sans">
                                                    <span className="font-semibold">✓ Location retrieved</span>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })()
                            ) : (
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-dm-sans">Getting location...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-6 py-6 flex-shrink-0 shadow-lg z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 100px)' }}>
                {currentStep === 'review' ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit() || isSubmitting}
                        className={`w-full font-bold py-5 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center font-dm-sans text-lg ${
                            canSubmit() && !isSubmitting
                                ? 'bg-gradient-to-r from-[#7DD756] to-[#6BC647] text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] shadow-xl'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                {t.submitting}...
                            </>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span>{t.submitPrices}</span>
                                <span className="text-2xl">🚀</span>
                            </div>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={nextStep}
                        disabled={
                            (currentStep === 'product' && !canProceedFromProduct()) ||
                            (currentStep === 'price' && !canProceedFromPrice()) ||
                            (currentStep === 'photo' && !canProceedFromPhoto())
                        }
                        className={`w-full font-bold py-6 px-8 rounded-2xl transition-all duration-200 flex items-center justify-center jersey-20-regular text-xl tracking-wide ${
                            ((currentStep === 'product' && canProceedFromProduct()) ||
                             (currentStep === 'price' && canProceedFromPrice()) ||
                             (currentStep === 'photo' && canProceedFromPhoto()))
                                ? 'bg-gradient-to-r from-[#FF6B35] via-[#F7931E] to-[#FFD23F] text-white hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] shadow-xl border-2 border-[#FF6B35]'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                        }`}
                    >
                        <span>NEXT</span>
                        <ChevronRight size={24} className="ml-3" />
                    </button>
                )}
            </div>
        </div>
    );
}