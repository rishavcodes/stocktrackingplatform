"use client";

import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSession } from "next-auth/react";
import React from "react";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/Sidebar/AdminSidebar";
import NavMenuDropDown from "@/components/Navbar/NavMenuDropDown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SuperUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Check if screen is small on initial load
  useEffect(() => {
    const checkScreenSize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleSidebarToggle = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  const handleProfileIconClick = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className="bg-gray-50 min-h-screen flex relative top-[-70px]">
      <div className="flex-shrink-0">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
        />
      </div>

      <div
        className={`flex flex-col flex-grow min-w-0 transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-[280px]"
          }`}
      >
        <div
          className={`fixed top-0 right-0 z-40 h-[72px] bg-white border-b border-gray-200 flex items-center justify-end px-6 shadow-sm transition-all`}
          style={{ left: sidebarCollapsed ? "4rem" : "280px" }}
        >
          {sidebarCollapsed && (
            <div className="flex items-center space-x-2 mr-auto">
              <h2 className="text-lg font-semibold text-gray-700">
                Welcome, {session?.user?.RegName}
              </h2>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="cursor-pointer" onClick={handleProfileIconClick}>
              <Avatar className="w-10 h-10 rounded-full border border-gray-200">
                <AvatarImage
                  src={session?.user?.profileUrl}
                  alt={session?.user?.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gray-100 flex items-center justify-center">
                  <Image
                    src={"/images/avatar/avatar.jpg"}
                    alt="avatar"
                    width={1280}
                    height={720}
                  />
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="relative">
              <AnimatePresence>
                {isMenuOpen && <NavMenuDropDown />}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-[120px] py-6">{children}</div>
      </div>
    </div>
  );
}
