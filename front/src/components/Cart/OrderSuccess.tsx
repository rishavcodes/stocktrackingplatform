"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface OrderSuccessProps {
  onContinue?: () => void;
  redirectInSeconds?: number;
}

export default function OrderSuccess({
  onContinue,
  redirectInSeconds = 5,
}: OrderSuccessProps) {
  const [countdown, setCountdown] = useState(redirectInSeconds);

  useEffect(() => {
    if (!onContinue) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-5 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] sm:max-w-sm text-center my-auto"
      >
        {/* Animated check mark */}
        <div className="mx-auto mb-5 sm:mb-6 w-20 h-20 sm:w-24 sm:h-24 relative">
          {/* Outer expanding ring */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-[3px] border-emerald-500"
          />

          {/* Subtle pulse ring behind */}
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
            transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-emerald-500/20"
          />

          {/* Draw the checkmark with SVG path animation */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M 28 52 L 45 68 L 72 36"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.35,
                ease: "easeOut",
              }}
            />
          </svg>
        </div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight px-2"
        >
          Order Placed Successfully
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.95 }}
          className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400"
        >
          Thank you for your purchase
        </motion.p>

        {/* Email note */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
          className="mt-5 sm:mt-6 mx-auto inline-flex items-start sm:items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg sm:rounded-full max-w-full"
        >
          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-[11px] sm:text-sm text-slate-600 dark:text-slate-300 leading-snug text-left">
            Check your registered email for purchase details
          </p>
        </motion.div>

        {/* Continue button */}
        {onContinue && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.25 }}
            onClick={onContinue}
            className="mt-6 sm:mt-8 w-full py-3 sm:py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 dark:active:bg-slate-200 text-white dark:text-slate-900 text-sm font-semibold rounded-lg transition-colors touch-manipulation"
          >
            Continue{countdown > 0 && ` (${countdown}s)`}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
