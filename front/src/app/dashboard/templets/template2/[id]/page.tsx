"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useParams } from "next/navigation";

type AnimatedCounterProps = {
  end: number;
  duration?: number;
  suffix?: string;
};

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 0, suffix = "" }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime: number;
      let animationFrame: number;

      const updateCount = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min(
          (timestamp - startTime) / (duration * 1000),
          1
        );

        setCount(Math.floor(progress * end));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(updateCount);
        }
      };

      animationFrame = requestAnimationFrame(updateCount);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

export default function Template2() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const params = useParams();
  const userId = params?.id;

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/getuserdata?id=${userId}`
        );
        const data = await response.json();
        setUserData(data.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
  

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId.toLowerCase());
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-xl">Loading your website...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-xl">Error loading user data</div>
      </div>
    );
  }

  const menuItems = [
    "Home",
    "About",
    "Services",
    "Research",
    "Compliance",
    "Blog",
    "Contact",
  ];

  return (
    <>
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.header
       
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 text-blue-600">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  {userData?.RegName || "FinanceWise"}
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  SEBI REG: {userData.regNumber}
                </p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {item}
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
                </motion.button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              {isMenuOpen ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 12H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 6H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 18H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </motion.button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
            >
              <nav className="py-4 space-y-2">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={item}
                    onClick={() => scrollToSection(item)}
                    className="block w-full text-left px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {item}
                  </motion.button>
                ))}
              </nav>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Hero Section */}
      <section
        id="home"
        className="min-h-screen flex items-center justify-center pt-32 pb-16 px-4"
      >
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-tight"
              >
                SEBI Registered
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Research Analyst
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg lg:text-xl text-gray-600 mt-6 max-w-2xl mx-auto lg:mx-0"
              >
                {userData.description || "Professional equity research and investment advisory services backed by years of market expertise and SEBI compliance"}
              </motion.p>

              {/* Analyst Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mt-8 grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto lg:mx-0"
              >
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {userData.RegName || "BRAJESH MAHESWARI"}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    SEBI REGISTERED RESEARCH ANALYST
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-900">
                    Contact No: {userData.number || "+918163918739"}
                  </h3>
                  <p className="text-gray-600 mt-1">SEBI REG NO: {userData.regNumber || "INH000007789"}</p>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <button
                  onClick={() => scrollToSection("research")}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
                >
                  Get Research Reports
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-300"
                >
                  Book Consultation
                </button>
              </motion.div>
            </motion.div>

            {/* Visual Element */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="relative w-full max-w-lg mx-auto">
                {/* Background Decorations */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-gray-100 rounded-3xl transform rotate-6"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-gray-200 rounded-3xl transform -rotate-3"></div>

                {/* Main Content Card */}
                <motion.div
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  transition={{ duration: 0.3 }}
                  className="relative bg-white rounded-3xl p-8 shadow-2xl border-2 border-blue-200"
                >
                  {/* Chart SVG */}
                  <div className="w-full h-64 mb-6">
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                      {/* Grid lines */}
                      <defs>
                        <pattern
                          id="grid"
                          width="40"
                          height="20"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 40 0 L 0 0 0 20"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {/* Chart line */}
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, delay: 1 }}
                        d="M 20 160 Q 80 140 120 120 T 200 80 T 300 60 T 380 40"
                        stroke="#0ea5e9"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Data points */}
                      {[20, 80, 120, 200, 300, 380].map((x, i) => (
                        <motion.circle
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 1.2 + i * 0.1 }}
                          cx={x}
                          cy={160 - i * 20}
                          r="4"
                          fill="#0ea5e9"
                        />
                      ))}
                    </svg>
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Market Performance
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Professional analysis & insights
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              About Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Expertise</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              With SEBI registration and years of market experience, we provide
              comprehensive research and advisory services
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Professional Credentials */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Professional Credentials
              </h3>

              <div className="space-y-6">
                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      SEBI Registration: {userData.regNumber}
                    </h4>
                    <p className="text-gray-600">Certified Research Analyst with full regulatory compliance</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <polyline
                        points="12,6 12,12 16,14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {userData.experience || "15+"} Years Market Experience
                    </h4>
                    <p className="text-gray-600">Deep expertise in equity research and financial analysis</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 20v-4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {userData.qualification || "CFA & MBA Finance"}
                    </h4>
                    <p className="text-gray-600">Strong educational background in finance and investments</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Philosophy */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 lg:p-12 shadow-2xl border-2 border-blue-200"
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Our Philosophy
              </h3>

              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  We believe in providing research-driven investment advice based
                  on fundamental analysis, risk management, and long-term wealth
                  creation strategies.
                </p>

                <p className="text-gray-700 leading-relaxed">
                  Our approach combines quantitative analysis with qualitative
                  insights to deliver actionable investment recommendations while
                  maintaining full transparency and compliance.
                </p>
              </div>

              {/* Stats */}
              <div className="flex justify-center mt-8 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="text-3xl font-bold text-blue-600 mb-2"
                  >
                    <AnimatedCounter end={userData.experience ? parseInt(userData.experience) : 15} suffix="+" />
                  </motion.div>
                  <p className="text-gray-600 text-sm">Years Experience</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Services</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Comprehensive research and advisory solutions for all investor types
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Equity Research Reports",
                description: "Detailed fundamental analysis of stocks with buy/sell recommendations",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
              {
                title: "Portfolio Advisory",
                description: "Personalized portfolio management and asset allocation strategies",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" />
                    <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
              {
                title: "Thematic Research",
                description: "Sector-wise analysis and thematic investment opportunities",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
              {
                title: "Market Commentary",
                description: "Daily market updates and macro-economic analysis",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" />
                    <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
              {
                title: "Risk Management",
                description: "Portfolio risk assessment and hedging strategies",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
              {
                title: "Investment Webinars",
                description: "Educational sessions and market outlook presentations",
                icon: (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="2" y="4" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 17V16" stroke="currentColor" strokeWidth="2" />
                  </svg>
                ),
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                }}
                className="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center group cursor-pointer"
              >
                <motion.div
                  whileHover={{
                    scale: 1.1,
                    rotate: 360,
                    transition: { duration: 0.6, ease: "easeInOut" },
                  }}
                  className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-gray-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:text-blue-700 transition-colors"
                >
                  {service.icon}
                </motion.div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  {service.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>

                {/* Hover effect line */}
                <motion.div
                  initial={{ width: 0 }}
                  whileHover={{ width: "60px" }}
                  className="h-1 bg-gradient-to-r from-blue-500 to-gray-500 mx-auto mt-6 rounded-full"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Section */}
      <section id="research" className="py-20 bg-gray-50 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Research & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Analysis</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              In-depth research methodology and sample reports showcasing our
              analytical expertise
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Sample Reports */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="lg:col-span-1 bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Sample Research Reports
              </h3>

              <div className="space-y-6">
                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Technology Sector Analysis
                    </h4>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      BUY
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Comprehensive review of IT sector with stock picks
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Jan 2025</span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Banking Sector Deep Dive
                    </h4>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      HOLD
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Analysis of PSU vs Private banks performance
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Dec 2024</span>
                  </div>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
                >
                  View Sample Reports
                </motion.button>
              </div>
            </motion.div>

            {/* Research Methodology */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="lg:col-span-1 bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Research Methodology
              </h3>

              <div className="space-y-4">
                {[
                  {
                    title: "Fundamental Analysis",
                    description: "Financial statement analysis, ratio analysis, and valuation models",
                    icon: (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                  },
                  {
                    title: "Technical Analysis",
                    description: "Chart patterns, trend analysis, and technical indicators",
                    icon: (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" />
                        <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" />
                        <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                  },
                  {
                    title: "Industry Research",
                    description: "Sector dynamics, competitive landscape, and market trends",
                    icon: (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                  },
                  {
                    title: "Risk Assessment",
                    description: "Risk-reward analysis and scenario planning",
                    icon: (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" />
                        <path d="M19 4H15a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                  },
                ].map((method, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-md border border-gray-200"
                  >
                    <motion.div
                      className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"
                      whileHover={{
                        rotate: 360,
                        transition: { duration: 0.6, ease: "easeInOut" },
                      }}
                    >
                      {method.icon}
                    </motion.div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {method.title}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {method.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Mandatory Disclosures */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="lg:col-span-1 bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Mandatory Disclosures
              </h3>

              <div className="space-y-6">
                {[
                  {
                    title: "Conflict of Interest",
                    description: "All potential conflicts of interest are disclosed in our research reports",
                    icon: "⚠️",
                    color: "bg-red-50 border-red-200",
                  },
                  {
                    title: "Investment Holdings",
                    description: "Any positions held by analyst or firm in recommended stocks",
                    icon: "ℹ️",
                    color: "bg-blue-50 border-blue-200",
                  },
                  {
                    title: "Research Independence",
                    description: "Our research is independent and free from external influence",
                    icon: "✅",
                    color: "bg-green-50 border-green-200",
                  },
                ].map((disclosure, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className={`p-6 rounded-xl border-2 ${disclosure.color} transition-all duration-300`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{disclosure.icon}</span>
                      <h4 className="font-semibold text-gray-900">
                        {disclosure.title}
                      </h4>
                    </div>
                    <p className="text-gray-700 text-sm">
                      {disclosure.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="bg-gradient-to-r from-blue-600 to-gray-700 rounded-2xl p-8 lg:p-12 text-white">
              <h3 className="text-2xl lg:text-3xl font-bold mb-4">
                Access Professional Research Reports
              </h3>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                Get detailed equity research reports with buy/sell recommendations
                based on comprehensive analysis
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Subscribe Now
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 bg-white px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Compliance & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Disclosures</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Full transparency and regulatory compliance
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Regulatory Information */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl p-8 lg:p-12 border-2 border-blue-200"
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Regulatory Information
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    SEBI Registration Number:
                  </h4>
                  <p className="text-lg text-gray-600 font-mono">{userData.regNumber}</p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Compliance Officer:
                  </h4>
                  <p className="text-gray-600">{userData.complianceOfficerName || "Mr. Rajesh Kumar"}</p>
                  <p className="text-gray-500">
                    Email: {userData.complianceOfficerEmail || "compliance@financewise.com"}
                  </p>
                  <p className="text-gray-500">Phone: {userData.complianceOfficerNumber || "+91-9876543210"}</p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Grievance Officer:
                  </h4>
                  <p className="text-gray-600">{userData.grievanceOfficerName || "Ms. Priya Sharma"}</p>
                  <p className="text-gray-500">
                    Email: {userData.grievanceOfficerEmail || "grievance@financewise.com"}
                  </p>
                  <p className="text-gray-500">Phone: {userData.grievanceOfficerNumber || "+91-9876543211"}</p>
                </div>
              </div>
            </motion.div>

            {/* Important Disclaimers */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl p-8 lg:p-12 border-2 border-blue-200"
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Important Disclaimers
              </h3>

              <div className="space-y-6 text-gray-600">
                <p className="leading-relaxed">
                  • Investment in securities market are subject to market risks,
                  read all the related documents carefully before investing.
                </p>

                <p className="leading-relaxed">
                  • Past performance may not be indicative of future results.
                </p>

                <p className="leading-relaxed">
                  • We do not guarantee returns or provide any assurance on
                  investment performance.
                </p>

                <p className="leading-relaxed">
                  • All investment decisions should be made based on your risk
                  profile and financial goals.
                </p>

                <p className="leading-relaxed">
                  • For investor grievances, visit:{" "}
                  <motion.a
                    href="#"
                    whileHover={{ scale: 1.05 }}
                    className="text-blue-600 hover:text-blue-700 font-semibold underline"
                  >
                    SEBI SCORES Portal
                  </motion.a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section id="blog" className="py-20 bg-white px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Blog & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Insights</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Stay informed with our latest market analysis and educational
              content
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Market Updates & Analysis */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl p-8 lg:p-12 border-2 border-blue-200"
            >
              <div className="mb-8">
                <motion.div
                  className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6"
                  whileHover={{
                    rotate: 360,
                    transition: { duration: 0.6, ease: "easeInOut" },
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <polyline
                      points="22 12 18 12 15 21 9 3 6 12 2 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Market Updates & Analysis
                </h3>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Regular updates on market trends, sector analysis, and investment opportunities",
                  "Articles covering fundamental and technical analysis insights",
                  "Market insights from our certified research analysts",
                  "Educational posts on investment strategies and financial planning",
                ].map((update, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-3"></div>
                    <p className="text-gray-700 leading-relaxed">{update}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  Latest Market Insight
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Technology sector shows strong fundamentals despite recent
                  market volatility. Key picks for long-term investors...
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Published: Jan 15, 2025</span>
                  <span>5 min read</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Regulatory Updates */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 lg:p-12 border-2 border-blue-200"
            >
              <div className="mb-8">
                <motion.div
                  className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600 mb-6"
                  whileHover={{
                    rotate: 360,
                    transition: { duration: 0.6, ease: "easeInOut" },
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </motion.div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Regulatory Updates
                </h3>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  "Latest SEBI circulars and regulatory changes affecting investors",
                  "Updates on tax implications and policy changes",
                  "Compliance requirements and investor protection measures",
                  "Important announcements relevant to retail and institutional investors",
                ].map((update, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 w-2 h-2 bg-gray-500 rounded-full mt-3"></div>
                    <p className="text-gray-700 leading-relaxed">{update}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  Recent SEBI Update
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  New regulations for investment advisers come into effect from
                  Q2 2025. Here&apos;s what investors need to know...
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Published: Jan 12, 2025</span>
                  <span>3 min read</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
            >
              Get In <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Touch</span>
            </motion.h2>
            <motion.p
              className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Ready to start your investment journey with us?
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-gray-900 mb-8">
                Contact Information
              </h3>

              <div className="space-y-6">
                {[
                  {
                    icon: (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                    title: "Registered Office",
                    details: `${userData.address1}, ${userData.address2}, ${userData.city}, ${userData.state}`,
                  },
                  {
                    
                    title: "Phone",
                    details: userData.number,
                  },
                  {
                    icon: (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" />
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ),
                    title: "Email",
                    details: userData.email,
                  },
                  {
                    icon: (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.150-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.130-.606.134-.133.298-.347.446-.520.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.520-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.510-.173-.008-.371-.010-.570-.010-.198 0-.520.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.200 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.360.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.570-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488" />
                      </svg>
                    ),
                    title: "WhatsApp",
                    details: userData.whatsapp || userData.number,
                  },
                ].map((info, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02, x: 10 }}
                    className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {info.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {info.title}
                      </h4>
                      <p className="text-gray-600">{info.details}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 lg:p-12 shadow-2xl border-2 border-blue-200"
            >
              <form className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Name
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Your full name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Email
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="email"
                    id="email"
                    name="email"
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Phone
                  </label>
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Message
                  </label>
                  <motion.textarea
                    whileFocus={{ scale: 1.02 }}
                    id="message"
                    name="message"
                    placeholder="Tell us about your investment goals..."
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-300 resize-none"
                    required
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
                >
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          {/* Main Footer Content */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 py-16"
          >
            {/* Company Info */}
            <motion.div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 text-blue-400">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{userData.RegName || "FinanceWise"}</h3>
                  <p className="text-gray-400 text-sm">SEBI REG: {userData.regNumber}</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6 leading-relaxed">
                SEBI Registered Research Analyst providing professional equity
                research and investment advisory services with complete regulatory
                compliance.
              </p>

              <p className="text-gray-400 text-sm mb-4">
                Registration No: {userData.regNumber}
              </p>

              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <strong>Phone:</strong> {userData.number}
                </p>
                <p>
                  <strong>Email:</strong> {userData.email}
                </p>
                <p>
                  <strong>Address:</strong> {userData.address1}, {userData.address2}, {userData.city}, {userData.state}
                </p>
              </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div>
              <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {menuItems.map((link, index) => (
                  <li key={index}>
                    <button
                      onClick={() => scrollToSection(link)}
                      className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Important Links */}
            <motion.div>
              <h4 className="text-lg font-semibold mb-6">Important Links</h4>
              <ul className="space-y-3">
                {[
                  { name: "Privacy Policy", href: "#" },
                  { name: "Terms & Conditions", href: "#" },
                  { name: "SEBI SCORES Portal", href: "#" },
                ].map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <h5 className="font-semibold mb-3 text-blue-400">
                  Connect With Us
                </h5>
                <div className="flex space-x-4">
                  {/* Social Media Icons */}
                  <motion.a
                    href="#"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-400 hover:bg-gray-700 transition-all duration-200"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </motion.a>

                  <motion.a
                    href="#"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-400 hover:bg-gray-700 transition-all duration-200"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Disclaimer Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="border-t border-gray-800 py-8"
          >
            <div className="bg-gray-800 rounded-xl p-6">
              <h5 className="font-semibold mb-4 text-blue-400">
                Important Disclaimer
              </h5>
              <p className="text-gray-300 text-sm leading-relaxed">
                Investment in securities market are subject to market risks, read
                all the related documents carefully before investing.
              </p>
            </div>
          </motion.div>

          {/* Bottom Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="border-t border-gray-800 py-6 flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm"
          >
            <p>
              © {new Date().getFullYear()} {userData.RegName || "FinanceWise"}. All rights reserved. Past performance may not be
              indicative of future results.
            </p>
          </motion.div>
        </div>
      </footer>
    </div>
  </>
  );
}