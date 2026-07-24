"use client";
import { useState, useEffect } from "react";
import { FiCheckCircle, FiInfo, FiUser } from "react-icons/fi";

import PackagePricingSection from "./PackagePricingSection";
import { useSession } from "next-auth/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type SPType = {
    [key: string]: string;
};

export default function PackagePage({ data, marketplaceSlug }: { data: any; marketplaceSlug?: string }) {

    const session = useSession()

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [spData, setSpData] = useState<SPType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSpData = async (id: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
            );

            if (res.status === 200) {
                const response = await res.json();
                setSpData(response.data);
            } else {
                setError("Failed to fetch data");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session.data?.user) {
            setIsLoggedIn(true);
        }
        if (data?.authorData?.id) {
            fetchSpData(data?.authorData?.id);
        }
    }, [session]);

    return (
        <div className="max-w-7xl bg-white dark:bg-gray-900 my-8 mx-auto p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 text-left">

            {/* Header */}
            <section className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                        {data.title}
                    </h1>
                    <div className="bg-green-100 dark:bg-green-900/30 px-5 py-2 rounded-full text-green-700 dark:text-green-300 font-medium text-sm">
                        {data.includedServices.length} Services Included
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 mb-8"></div>

                {/* Banner + Pricing */}
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    <div className="lg:w-7/12 flex">
                        <img
                            src={data.bannerURL}
                            alt={data.title}
                            className="w-full h-full min-h-[280px] max-h-[520px] rounded-2xl shadow-md object-cover"
                        />
                    </div>

                    <div className="lg:w-5/12 flex">
                        <PackagePricingSection
                            data={data}
                            spData={spData}
                            isLoggedIn={isLoggedIn}
                            marketplaceSlug={marketplaceSlug}
                        />
                    </div>
                </div>
            </section>

            {/* About Section */}
            <div className="w-full text-justify py-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white pb-4 mb-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <FiInfo className="mr-3 text-blue-500" />
                    About the Package
                </div>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {data.description}
                    </p>
                </div>
            </div>

            {/* Included Services */}
            <div className="py-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white pb-4 mb-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
                    <FiCheckCircle className="mr-3 text-green-500" />
                    Included Services
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.includedServices.map((s: any) => (
                        <div
                            key={s._id}
                            className="flex items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        >
                            <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-2 mr-4"></div>
                            <div className="text-lg text-gray-800 dark:text-gray-200">
                                {s.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Provider Info */}
            {data.authorData && (
                <div className="py-6">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white pb-4 mb-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
                        <FiUser className="mr-3 text-blue-500" />
                        Service Provider
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <Avatar className="w-14 h-14">
                            {data.authorData.authorImage ? (
                                <AvatarImage src={data.authorData.authorImage} />
                            ) : null}
                            <AvatarFallback className="bg-green-100 text-green-700 text-lg font-bold">
                                {data.authorData.name?.charAt(0) || "S"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {data.authorData.name}
                            </p>
                            {data.authorData.type && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {data.authorData.type}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
