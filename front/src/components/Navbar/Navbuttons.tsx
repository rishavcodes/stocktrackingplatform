"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import NavMenuDropDown from "./NavMenuDropDown";
import { AnimatePresence } from "framer-motion";
import NavMobile from "./NavMobile";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbuttons() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <>
      {session.data ? (
        <div className="flex items-center gap-4 ml-auto">
          <div
            className="flex items-center gap-2 relative px-3 cursor-pointer p-4"
            onClick={toggleMenu}
          >
            <div className="text-black hover:text-greenishBlue text-xl">
              {session.data.user.RegName || "Your Workspace"}
            </div>

            <AnimatePresence>
              {isMenuOpen && <NavMenuDropDown />}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <>
          {!pathname.startsWith("/view/services") &&
            !pathname.startsWith("/view/portfolio") && (
              <div className="flex items-center gap-4 ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="bg-[#02d2bf] text-white font-semibold text-xl py-2 px-4 rounded-lg hover:bg-[#03bce1] transition-colors">
                      Sign In
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      className="cursor-pointer text-base py-2"
                      onClick={() => router.push("/auth/provider/signin")}
                    >
                      Sign in as Expert
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-base py-2"
                      onClick={() => router.push("/auth/user/signin")}
                    >
                      Sign in as Customer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="sm:hidden">
                  <NavMobile />
                </div>
              </div>
            )}
        </>
      )}
    </>
  );
}
