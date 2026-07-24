"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import TradingInfographic from "../TradingInfographic";
import MarketData from "../MarketData";
import { useState } from "react";

const HeroSection = () => {
  const [open, setOpen] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="min-h-screen bg-background relative overflow-hidden pt-[60px] md:pt-[100px]">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-secondary/5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-secondary/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Column - Content */}
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <h1 className="mt-16 xl:mt-2 text-5xl lg:text-7xl font-montserrat font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent bg-clip-text text-transparent hero-gradient-black">
                  Empowering
                </span>
                <br />
                <span className="text-foreground hero-text-dark">
                  SEBI-Registered
                </span>
                <br />
                <span className="bg-gradient-to-r from-brand-secondary to-brand-primary bg-clip-text text-transparent hero-gradient-black">
                  Experts
                </span>
              </h1>
            </motion.div>

            <motion.p
              className="text-xl text-muted-foreground leading-relaxed max-w-2xl font-montserrat font-regular hero-description-dark"
              variants={itemVariants}
            >
              One platform for compliance, analytics & smarter trading. Modern
              Infrastructure for Research Analysts, Investment Advisors with
              Compliant, Scalable, and White-labeled Technology.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              variants={itemVariants}
            >
              <Button
                size="lg"
                onClick={() => setOpen(true)}
                className="bg-primary text-primary-foreground px-8 py-4 rounded-lg hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 transform hover:scale-105 font-montserrat font-semibold"
              >
                Book a Demo
              </Button>
            </motion.div>
          </div>

          {/* Right Column - Market Data and Trading Infographic */}
          <motion.div className="relative space-y-1" variants={itemVariants}>
            <MarketData />
            <TradingInfographic />
          </motion.div>
        </motion.div>
      </div>

      {/* Calendly Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-[90%] md:w-[70%] lg:w-[50%] h-[80%] p-4 shadow-lg relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-gray-600 dark:text-gray-300 hover:text-red-500 text-xl"
            >
              ✕
            </button>
            <iframe
              src="https://calendly.com/tradeboxsales/tradebox-platform-demo?month=2025-08"
              className="w-full h-full rounded-md"
              frameBorder="0"
            ></iframe>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
