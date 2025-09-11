import React from 'react';

const EventCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-md overflow-hidden">
        <div className="relative overflow-hidden">
            <div className="h-48 bg-gray-200 dark:bg-dark-surface-light" />
            <div className="p-4">
                <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-dark-surface-light mr-3" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-dark-surface-light rounded" />
                        <div className="h-5 w-full bg-gray-200 dark:bg-dark-surface-light rounded" />
                    </div>
                </div>
                <div className="h-3 w-1/3 bg-gray-200 dark:bg-dark-surface-light rounded mt-4" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent animate-shimmer" />
        </div>
    </div>
);

export default EventCardSkeleton;
