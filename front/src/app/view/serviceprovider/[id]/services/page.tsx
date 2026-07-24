"use client";

import { ServiceCard } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ServicesPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const { data, isLoading, error } = useSWR<{ data: OurServicesType[] }>(
    id ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/allservices?id=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const services = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading services...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Services
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            We couldnt load the services at this time.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Services Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There are no services offered at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Services
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {services.length} service{services.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <Toaster />
      <ServiceCard
        servicesArray={services}
        gridLayout="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      />
    </div>
  );
}