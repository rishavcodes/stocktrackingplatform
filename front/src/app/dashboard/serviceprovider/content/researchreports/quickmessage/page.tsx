"use client";

// Standalone route kept thin — the actual feature lives in the shared
// QuickMessageBroadcast component, which is also embedded inline on the
// "Create Recommendation" page.

import { Toaster } from "@/components/ui/toaster";
import QuickMessageBroadcast from "@/components/ServiceProvider/QuickMessageBroadcast";

export default function QuickMessagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-950 dark:to-gray-900 px-4 py-6">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <QuickMessageBroadcast />
      </div>
    </div>
  );
}
