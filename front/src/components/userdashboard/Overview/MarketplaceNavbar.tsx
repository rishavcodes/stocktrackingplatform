// app/marketplace/[id]/components/MarketplaceNavbar.tsx
"use client";

import { ArrowLeft, Building2, Search, Bell, LogIn, Menu, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Marketplace } from "./types";

interface MarketplaceNavbarProps {
  marketplace: Marketplace | null;
}

export default function MarketplaceNavbar({ marketplace }: MarketplaceNavbarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? "bg-white border-b shadow-lg backdrop-blur-lg bg-white/95"
          : "bg-white border-b"
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>

            <Separator orientation="vertical" className="h-6 bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-[#01a6b6] to-[#018b99] flex items-center justify-center shadow-md">
                {marketplace?.brokerSnapshot.profileUrl ? (
                  <Image
                    src={marketplace.brokerSnapshot.profileUrl}
                    alt={marketplace.brokerSnapshot.name || "Broker"}
                    width={40}
                    height={40}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                    {marketplace?.name || "Marketplace"}
                  </h1>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-medium text-gray-700">
                    {marketplace?.brokerSnapshot?.name || "Broker"}
                  </span>
                  <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar - Centered */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#01a6b6] transition-colors" />
              <Input
                placeholder="Search recommendations, analysts, portfolios..."
                className="pl-12 pr-10 border-gray-300 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:border-[#01a6b6] focus:ring-1 focus:ring-[#01a6b6] transition-all rounded-xl h-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="inline-flex items-center gap-1 rounded border bg-white px-1.5 py-0.5 text-xs font-mono text-gray-500">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-[#01a6b6] hover:bg-[#e6f7f9] rounded-lg relative"
              >
                <Bell className="h-4 w-4 mr-2" />
                Alerts
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 bg-gray-200 hidden md:block" />

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden md:flex border-[#01a6b6] text-[#213faa] hover:bg-[#e6f7f9] hover:text-[#213faa]"
              >
                Sign Up
              </Button>
              <Button className="bg-gradient-to-r from-[#213faa] to-[#018b99] hover:opacity-90 text-white shadow-md px-6">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </Button>

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden pb-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-10 border-gray-300 bg-gray-50 rounded-lg"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}