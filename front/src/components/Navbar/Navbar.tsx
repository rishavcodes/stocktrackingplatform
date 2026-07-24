"use client";

import Image from "next/image";
import NavDropdown from "./NavDropdown";
import { dropDownData } from "./NavbarConstants";
import Navbuttons from "./Navbuttons";
import Link from "next/link";
import NavSearch from "./NavSearch";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AuthWindow from "./AuthWindow";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { useSession } from "next-auth/react";
import { Search, X, Menu } from "lucide-react";

export default function Navbar() {
  const session = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // console.log("session.data.user", session.data?.user)

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hideLogo = pathname.startsWith("/view/services") || pathname.startsWith("/view/portfolio") || pathname.startsWith("/view/packages") || pathname.startsWith("/view/courses") || pathname.startsWith("/view/researchreport/page/") || pathname.startsWith("/view/researchreport/pdf/") || pathname.startsWith("/view/events/details/") || pathname.startsWith("/view/factsheet") || pathname.startsWith("/checkout");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAuthWindowOpen = useSelector((state: RootState) => state.authWindow);

  return (
    <motion.div 
      className="fixed w-full top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/20"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Desktop Navbar */}
      <motion.nav 
        className="mx-auto hidden md:flex text-xs xl:text-sm 2xl:text-base px-4 lg:px-5 xl:px-6 2xl:px-[130px] items-center gap-4 py-3 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {!hideLogo && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link
              href={"/"}
              className="flex gap-2 items-center cursor-pointer"
            >
              <Image
                src={"/images/logo/fulllogo.png"}
                alt="navlogo"
                width={180}
                height={180}
              />
            </Link>
          </motion.div>
        )}

        {/* <ul className="flex items-center gap-5 xl:gap-6 pl-5">
          <li>
            <Link href={"/marketplace"}>
              Market Place
            </Link>
          </li>
        </ul> */}

        <Navbuttons />
      </motion.nav>

      {/* Mobile Navbar */}
      <motion.div
        className={`flex md:hidden w-full px-4 py-3 items-center sticky top-0 z-50 ${
          hideLogo ? "justify-end" : "justify-between"
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {!hideLogo && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Link href={"/"} className="flex gap-2 items-center">
              <Image
                src={"/images/logo/nav.png"}
                alt="navlogo"
                width={40}
                height={40}
              />
              <h1 className="text-xl text-foreground">
                Trade<span className="font-semibold">Box</span>
              </h1>
            </Link>
          </motion.div>
        )}

        <div className="flex items-center gap-4">
          <Navbuttons />
        </div>
      </motion.div>

      <AnimatePresence>{isAuthWindowOpen && <AuthWindow />}</AnimatePresence>
    </motion.div>
  );
}