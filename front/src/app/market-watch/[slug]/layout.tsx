"use client";

import Sidebar, { sidebarButton } from "@/components/Sidebar/Sidebar";
import React from "react";
import { useState, useEffect } from "react";

export default function MarketWarchLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
   const [slug, setSlug] = useState<string>("");

   useEffect(() => {
     const getId = async () => {
       const { slug } = await params;
       setSlug(slug);
     };
     getId();
   }, [params]);
   
  const MarketWatchSideBar: sidebarButton[] = [
    {
      title: "Articles",
      base: `/market-watch/${slug}/articles`,
      href: `/market-watch/${slug}/articles`,
    },
    {
      title: "Videos",
      base: `/market-watch/${slug}/videos`,
      href: `/market-watch/${slug}/videos`,
    },
    {
      title: "Podcasts",
      base: `/market-watch/${slug}/podcasts`,
      href: `/market-watch/${slug}/podcasts`,
    },
    {
      title: "Events",
      base: `/market-watch/${slug}/events`,
      href: `/market-watch/${slug}/events`,
    },
  ];

  return (
    <div className="bg-lightGrey h-auto overflow-hidden dark:bg-blackShade flex gap-5">
      <Sidebar
        haveAvatar={false}
        heading={slug.toUpperCase()}
        buttonsArray={MarketWatchSideBar}
        iconIndex={0}
        height="h-auto"
      />
      <div className="w-full mt-10 pb-20">{children}</div>
    </div>
  );
}
