"use client";

import { useParams } from "next/navigation";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";

export default function MarketplaceUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const marketplaceId = params?.slug as string;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-50">
      <MarketplaceNavbar marketplaceId={marketplaceId} />
      <main className="pt-[76px]">{children}</main>
    </div>
  );
}
