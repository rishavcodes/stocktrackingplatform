"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

// Top-level hubs of the user dashboard. A back button on these would either
// dead-end or leave the dashboard, so we hide it there.
const HIDE_ON: string[] = [
  "/dashboard/user",
  "/dashboard/user/myprofile",
  "/dashboard/user/overview",
];

export default function BackButton({
  fallbackHref = "/dashboard/user",
}: {
  fallbackHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname && HIDE_ON.includes(pathname)) return null;

  // A page opened in a fresh tab (e.g. via window.open) has no in-app history,
  // so a plain router.back() silently does nothing. Mirror the guard used by
  // the protected PDF viewer: only call back() when there's history to pop,
  // otherwise route to a sensible dashboard fallback.
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className="inline-flex items-center gap-2 p-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
