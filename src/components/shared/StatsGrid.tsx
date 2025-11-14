'use client';

import React from 'react';

interface StatItem {
    label: string;
    value: string;
    icon?: React.ReactNode;
    color?: string;
}

interface StatsGridProps {
    stats: StatItem[];
    columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, columns = 3 }: StatsGridProps) {
    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    }[columns];

    return (
        <div className={`grid ${gridCols} gap-4 mt-6`}>
            {stats.map((stat, index) => (
                <div key={index} className="text-center">
                    {stat.icon && (
                        <div className="flex justify-center mb-2">
                            {stat.icon}
                        </div>
                    )}
                    <div className={`text-2xl font-bold mb-1 ${stat.color || 'text-[#7DD756]'}`}>
                        {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}


