import React from "react";
import Image from "next/image";

interface ServiceHeaderProps {
    title: string;
    bannerUrl: string;
    segment?: string; // Optional segment tag (e.g., "Stocks", "Commodities")
    className?: string; // For additional styling
}

export const ServiceHeader: React.FC<ServiceHeaderProps> = ({
    title,
    bannerUrl,
    segment,
    className = "",
}) => {
    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* Title + Segment Tag (inline on desktop, stacked on mobile) */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>

                {segment && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm dark:bg-blue-900 dark:text-blue-200">
                        {segment}
                    </span>
                )}
            </div>

            {/* Banner Image (responsive with Next.js Image optimization) */}
            <div className="relative w-full h-64 sm:h-80 rounded-lg overflow-hidden">
                <Image
                    src={bannerUrl}
                    alt={`Banner for ${title}`}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Divider */}
            <hr className="border-t border-gray-200 dark:border-gray-700 my-2" />
        </div>
    );
};