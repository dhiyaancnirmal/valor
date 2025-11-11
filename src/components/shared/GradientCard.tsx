'use client';

import React from 'react';

interface GradientCardProps {
    title: string;
    value: string;
    subtitle?: string;
    gradient?: string;
    icon?: React.ReactNode;
}

export function GradientCard({ 
    title, 
    value, 
    subtitle, 
    gradient = 'bg-gradient-to-br from-[#7DD756] to-green-600',
    icon 
}: GradientCardProps) {
    return (
        <div className={`${gradient} rounded-2xl shadow-lg p-6 text-white relative`}>
            <div className="mb-2">
                <h2 className="text-base font-medium opacity-90">{title}</h2>
            </div>
            <div className="text-5xl font-bold mb-3">
                {value}
            </div>
            {subtitle && (
                <p className="text-sm opacity-90 leading-relaxed">
                    {subtitle}
                </p>
            )}
            {icon && (
                <div className="absolute top-6 right-6">
                    {icon}
                </div>
            )}
        </div>
    );
}

