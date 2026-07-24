"use client";
import { useState } from "react";
import Link from "next/link";
import { FooterArray, FooterIcons } from "./FooterConstants";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuthModal from "@/components/Modal/AuthModal";

export default function Footer() {
  const session = useSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const handleLoginModal = () => {
    setIsAuthModalOpen(true);
  };

  // Sign In As options
  const signInOptions = [
    {
      title: "Research Analyst",
      href: "/auth/provider/signin",
    },
    {
      title: "Broker",
      href: "/auth/provider/signin",
    },
  ];

  return (
    <footer className="relative text-white overflow-hidden">
      {/* Background decorative elements */}
      {/* <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-500/20 to-transparent rounded-full blur-3xl"></div>
      </div> */}

      <div className="relative container mx-auto px-4 lg:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <motion.div
              className="flex items-center gap-3 mb-6"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-lg blur-md opacity-50"></div>
                <Image
                  src="/images/logo/nav.png"
                  alt="TradeBox Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 relative z-10"
                />
              </div>
              <span className="text-2xl font-bold text-white section-title-dark">
                Trade<span className="bg-gradient-to-r from-cyan-400 to-indigo-600 bg-clip-text text-transparent">Box</span>
              </span>
            </motion.div>

            <div className="flex gap-3 mt-8">
              {FooterIcons.map((icon, idx) => {
                const Icon = icon.icon;
                return (
                  <motion.a
                    key={idx}
                    href={icon.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={icon.text}
                    className="group relative"
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 group-hover:border-cyan-400/50 transition-all duration-300">
                      <Icon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors duration-300" />
                    </div>
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider section-text-dark relative inline-block">
              INFORMATION
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600"></span>
            </h3>
            <ul className="space-y-3">
              {FooterArray[1].map((footer) => (
                <motion.li
                  key={footer.title}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="group"
                >
                  <Link
                    href={footer.href}
                    className="text-gray-400 hover:text-white transition-colors section-subtitle-dark flex items-center gap-2"
                  >
                    <span className="w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-4 transition-all duration-300"></span>
                    {footer.title}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Docs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider section-text-dark relative inline-block">
              DOCS
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600"></span>
            </h3>
            <ul className="space-y-3">
              {FooterArray[2].map((footer) => (
                <motion.li
                  key={footer.title}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="group"
                >
                  <Link
                    href={footer.href}
                    className="text-gray-400 hover:text-white transition-colors section-subtitle-dark flex items-center gap-2"
                  >
                    <span className="w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-4 transition-all duration-300"></span>
                    {footer.title}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Sign In As Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider section-text-dark relative inline-block">
              SIGN IN AS
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600"></span>
            </h3>
            <ul className="space-y-3">
              {signInOptions.map((option) => (
                <motion.li
                  key={option.title}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="group"
                >
                  <Link
                    href={option.href}
                    className="text-gray-400 hover:text-white transition-colors section-subtitle-dark flex items-center gap-2"
                  >
                    <span className="w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-4 transition-all duration-300"></span>
                    {option.title}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider section-text-dark relative inline-block">
              CONTACT US
              <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600"></span>
            </h3>
            <div className="space-y-5">
              <motion.div
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="group"
              >
                <Link
                  href={"mailto:info@tradeboxlive.com"}
                  className="text-gray-400 hover:text-white transition-colors section-subtitle-dark flex items-center gap-2"
                >
                  <span className="w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-4 transition-all duration-300"></span>
                  info@tradeboxlive.com
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  onClick={() => setOpen(true)}
                  className="relative group bg-gradient-to-r from-cyan-500 to-indigo-600 text-white px-8 py-4 rounded-lg overflow-hidden font-montserrat font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                >
                  <span className="relative z-10">Book a Demo</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-white/10 pt-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-400 text-sm text-center md:text-left section-subtitle-dark">
              © 2025 Tradebox Fintech Solution PVT LTD. All rights reserved.{" "}
              {/* Discreet admin entry — same color as surrounding text so it
                  doesn't read as a link. Used to reach the admin sign-in page
                  from the installed PWA where the URL bar isn't available. */}
              <Link
                href="/auth/admin/signin"
                aria-label="Admin"
                className="text-gray-400 hover:text-gray-400 no-underline select-none"
              >
                .
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-cyan-400 transition-colors section-subtitle-dark relative group"
                >
                  Terms of Service
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-cyan-400 transition-colors section-subtitle-dark relative group"
                >
                  Privacy Policy
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
                <Link
                  href="/cookies"
                  className="text-gray-400 hover:text-cyan-400 transition-colors section-subtitle-dark relative group"
                >
                  Cookie Policy
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Calendly Modal */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl relative overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500/20 backdrop-blur-sm rounded-full text-gray-600 dark:text-gray-300 hover:text-red-500 border border-white/20 hover:border-red-500/50 transition-all duration-300 group"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
            <iframe
              src="https://calendly.com/tradeboxsales/tradebox-platform-demo?month=2025-08"
              className="w-full h-full rounded-2xl"
              frameBorder="0"
            ></iframe>
          </motion.div>
        </motion.div>
      )}
    </footer>
  );
}