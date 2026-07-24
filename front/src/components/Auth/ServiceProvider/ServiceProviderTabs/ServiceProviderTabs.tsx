"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CSSProperties } from "react";

export type ServiceProviderTabsProps = {
  tabData: { title: string; href: string }[];
  marginTop?: string;
};

export default function ServiceProviderTabs({
  tabData,
  marginTop = "mt-10",
}: ServiceProviderTabsProps) {
  const pathname = usePathname();

  // Define scrollbar hiding as CSS classes instead of inline styles
  return (
    <div
      className={`flex flex-wrap overflow-x-auto border-b border-gray-200 dark:border-gray-700 ${marginTop} scrollbar-hide`}
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none" as "none", // Type assertion
        msOverflowStyle: "none"
      }}
    >
      <div className="flex w-full">
        {tabData.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              href={tab.href}
              key={tab.title}
              className={`px-5 py-3 font-medium whitespace-nowrap transition-all duration-200 text-sm md:text-base
              ${isActive
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white/5 dark:bg-black/10"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
            >
              {tab.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}