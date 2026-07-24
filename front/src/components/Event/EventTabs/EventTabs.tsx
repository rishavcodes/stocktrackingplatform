"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ServiceProviderTabsProps = {
  tabData: { title: string; href: string }[];
  marginTop?: string;
};

export default function EventTabs({
  tabData,
  marginTop = "mt-10",
}: ServiceProviderTabsProps) {
  const pathname = usePathname();

  return (
    <div
      className={`flex ss:gap-5 gap-1 ss:w-full w-[95%] mx-auto ss:${marginTop} mt-11`}
    >
      {tabData.map((tab) => (
        <Link
          href={tab.href}
          key={tab.title}
          className={`ss:px-10 px-5 py-3 ss:text-[15px] text-[13px] cursor-pointer ${
            pathname === tab.href &&
            "bg-white dark:bg-black  border-t-4 border-green"
          }`}
        >
          {tab.title}
        </Link>
      ))}
    </div>
  );
}