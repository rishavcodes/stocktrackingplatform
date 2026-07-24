"use client";

import { SubscribedRecommendation } from "@/components";

export default function SubscribedRecommendationsPage() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1 sm:py-4">
      {/* Header */}


      {/* Content Card — tighter padding on mobile so filters + tabs aren't
          buried under ~50px of dead chrome. Desktop keeps the original feel. */}
      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-6">
        <SubscribedRecommendation />
      </div>
    </div>
  );
}
