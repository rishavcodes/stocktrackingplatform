"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useParams } from "next/navigation"; // ✅ get dynamic route param

type AnimatedCounterProps = {
  end: number;
  duration?: number;
  suffix?: string;
};
// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2, suffix = "" }: AnimatedCounterProps) => {
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

export default  function Template1Page() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const params = useParams(); // ✅ get route params
  const userId = params?.id; // matches [id] in /templets/[id]
 
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

  // ✅ Now you can access userData.name, userData.plan, etc.
  const menuItems = [
    "Home",
    "About",
    "Services",
    "Research",
    "Pricing",
    "Compliance",
    "Blog",
    "Contact",
  ];

  return (
    <div className="font-montserrat bg-black text-white min-h-screen">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-black/90 backdrop-blur-md border-b border-white/10 fixed w-full top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center space-x-3">
                {/* Logo Icon */}
                <div className="bg-white rounded-lg p-2 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L13.5 8.5L20 7L14.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9.5 12L4 7L10.5 8.5L12 2Z" />
                  </svg>
                </div>
                {/* Company Name and Registration */}
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-white">{userData.RegName}</h1>
                  <p className="text-xs text-gray-400">
                    SEBI REG: {userData.regNumber}
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="hidden md:flex items-center space-x-4 ml-auto mr-8">
              {menuItems.map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-300 hover:text-white px-2 py-2 text-sm font-medium transition-colors relative group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </motion.a>
              ))}
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section
        id="home"
        className="pt-20 bg-gradient-to-br from-black via-dark-900 to-dark-800 min-h-screen flex items-center relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <motion.div
            className="text-center"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.h1
              
              className="text-6xl md:text-8xl font-bold mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                SEBI Registered
              </span>
              <br />
              <span className="text-white">Research Analyst</span>
            </motion.h1>

            <motion.p
             
              className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              {userData.description || "Professional equity research and investment advisory services backed by years of market expertise and SEBI compliance"}
            </motion.p>

            <motion.div
              
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12"
            >
              {/* Left Side - Analyst Information */}
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {userData.RegName}
                </h3>
                <p className="text-lg text-gray-300">
                  SEBI REGISTERED RESEARCH ANALYST
                </p>
              </div>

              {/* Right Side - Contact Information */}
              <div className="text-center md:text-right">
                <p className="text-2xl md:text-3xl font-bold text-white mb-1">
                  Contact No: {userData.number}
                </p>
                <p className="text-lg text-gray-300">
                  SEBI REG NO: {userData.regNumber}
                </p>
              </div>
            </motion.div>

            <motion.div
              
              className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
            >
              <motion.button
                className="bg-white text-black px-10 py-5 rounded-xl text-lg font-bold hover:bg-gray-200 transition-all shadow-2xl"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Research Reports
              </motion.button>
              <motion.button
                className="border-2 border-white text-white px-10 py-5 rounded-xl text-lg font-bold hover:bg-white hover:text-black transition-all"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Book Consultation
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-dark-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              About Our Expertise
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              With SEBI registration and years of market experience, we provide
              comprehensive research and advisory services
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Professional Credentials
              </h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-white rounded-full mt-2 mr-4"></div>
                  <div>
                    <p className="font-bold text-white text-lg">
                      SEBI Registration: {userData.regNumber}
                    </p>
                    <p className="text-gray-400">
                      Certified Research Analyst with full regulatory compliance
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-white rounded-full mt-2 mr-4"></div>
                  <div>
                    <p className="font-bold text-white text-lg">
                      {userData.type} - {userData.category}
                    </p>
                    <p className="text-gray-400">
                      Registered entity type and category
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-3 h-3 bg-white rounded-full mt-2 mr-4"></div>
                  <div>
                    <p className="font-bold text-white text-lg">
                      Registered Since: {new Date(userData.DOB).getFullYear()}
                    </p>
                    <p className="text-gray-400">
                      Years of experience in market analysis
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-white mb-6">
                Our Philosophy
              </h3>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                {userData.description || "We believe in providing research-driven investment advice based on fundamental analysis, risk management, and long-term wealth creation strategies."}
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our approach combines quantitative analysis with qualitative
                insights to deliver actionable investment recommendations while
                maintaining full transparency and compliance.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Our Services
            </h2>
            <p className="text-xl text-gray-400">
              Comprehensive research and advisory solutions for all investor
              types
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Equity Research Reports",
                description:
                  "Detailed fundamental analysis of stocks with buy/sell recommendations",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                  </svg>
                ),
              },
              {
                title: "Portfolio Advisory",
                description:
                  "Personalized portfolio management and asset allocation strategies",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                ),
              },
              {
                title: "Thematic Research",
                description:
                  "Sector-wise analysis and thematic investment opportunities",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                  </svg>
                ),
              },
              {
                title: "Market Commentary",
                description: "Daily market updates and macro-economic analysis",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
                  </svg>
                ),
              },
              {
                title: "Risk Management",
                description: "Portfolio risk assessment and hedging strategies",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.1 16,12.7V16.3C16,16.9 15.4,17.5 14.8,17.5H9.2C8.6,17.5 8,16.9 8,16.3V12.7C8,12.1 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z" />
                  </svg>
                ),
              },
              {
                title: "Investment Webinars",
                description:
                  "Educational sessions and market outlook presentations",
                icon: (
                  <svg
                    className="w-8 h-8 text-gray-700"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z" />
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
                whileHover={{ y: -10, scale: 1.02 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="mb-6 group-hover:scale-110 transition-transform duration-300 bg-gray-100 rounded-2xl p-3 w-fit">
                  {service.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {service.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Research/Analysis Section */}
      <section id="research" className="py-24 bg-dark-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Research & Analysis
            </h2>
            <p className="text-xl text-gray-400">
              In-depth research methodology and sample reports showcasing our
              analytical expertise
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sample Research Reports */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Sample Research Reports
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Technology Sector Analysis
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">
                    Comprehensive review of IT sector with stock picks
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 font-medium">BUY</span>
                    <span className="text-gray-500 text-xs">Jan 2025</span>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Banking Sector Deep Dive
                  </h4>
                  <p className="text-gray-400 text-sm mb-2">
                    Analysis of PSU vs Private banks performance
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 font-medium">HOLD</span>
                    <span className="text-gray-500 text-xs">Dec 2024</span>
                  </div>
                </div>
              </div>

              <motion.button
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Sample Reports
              </motion.button>
            </motion.div>

            {/* Research Methodology */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Research Methodology
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1">
                    1
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Fundamental Analysis
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Financial statement analysis, ratio analysis, and
                      valuation models
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1">
                    2
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Technical Analysis
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Chart patterns, trend analysis, and technical indicators
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1">
                    3
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Industry Research
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Sector dynamics, competitive landscape, and market trends
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1">
                    4
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      Risk Assessment
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Risk-reward analysis and scenario planning
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Disclosures */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">
                Mandatory Disclosures
              </h3>
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Conflict of Interest
                  </h4>
                  <p className="text-gray-300 text-sm">
                    All potential conflicts of interest are disclosed in our
                    research reports
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                  <h4 className="text-blue-400 font-semibold mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Investment Holdings
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Any positions held by analyst or firm in recommended stocks
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                  <h4 className="text-green-400 font-semibold mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Research Independence
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Our research is independent and free from external influence
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Compliance & Disclosures
            </h2>
            <p className="text-xl text-gray-400">
              Full transparency and regulatory compliance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Regulatory Information
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="font-bold text-white text-lg">
                    SEBI Registration Number:
                  </p>
                  <p className="text-gray-300 text-lg">{userData.regNumber}</p>
                </div>
                <div>
                  <p className="font-bold text-white text-lg">
                    Compliance Officer:
                  </p>
                  <p className="text-gray-300">{userData.complianceOfficerName}</p>
                  <p className="text-gray-300">
                    Email: {userData.complianceOfficerEmail}
                  </p>
                  <p className="text-gray-300">Phone: {userData.complianceOfficerNumber}</p>
                </div>
                <div>
                  <p className="font-bold text-white text-lg">
                    Grievance Officer:
                  </p>
                  <p className="text-gray-300">{userData.complianceOfficerName}</p>
                  <p className="text-gray-300">
                    Email: {userData.complianceOfficerEmail}
                  </p>
                  <p className="text-gray-300">Phone: {userData.complianceOfficerNumber}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Important Disclaimers
              </h3>
              <div className="space-y-4 text-gray-300">
                <p>
                  • {userData.disclaimer || "Investment in securities market are subject to market risks, read all the related documents carefully before investing."}
                </p>
                <p>
                  • Past performance may not be indicative of future results.
                </p>
                <p>
                  • We do not guarantee returns or provide any assurance on
                  investment performance.
                </p>
                <p>
                  • All investment decisions should be made based on your risk
                  profile and financial goals.
                </p>
                <p>
                  • For investor grievances, visit:{" "}
                  <a
                    href="https://scores.sebi.gov.in/"
                    className="text-white underline hover:text-gray-300 transition-colors"
                  >
                    SEBI SCORES Portal
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Blog/Insights Section */}
      <section id="blog" className="py-24 bg-dark-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Blog & Insights
            </h2>
            <p className="text-xl text-gray-400">
              Stay informed with our latest market analysis and educational
              content
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Market Updates & Analysis
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Regular updates on market trends, sector analysis, and
                      investment opportunities
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Articles covering fundamental and technical analysis
                      insights
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Market insights from our certified research analysts
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Educational posts on investment strategies and financial
                      planning
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Regulatory Updates
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Latest SEBI circulars and regulatory changes affecting
                      investors
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Updates on tax implications and policy changes
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Compliance requirements and investor protection measures
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Important announcements relevant to retail and
                      institutional investors
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <motion.button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Subscribe to Updates
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-dark-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Get In Touch
            </h2>
            <p className="text-xl text-gray-400">
              Ready to start your investment journey with us?
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-white mb-8">
                Contact Information
              </h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg
                      className="w-4 h-4 text-black"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">
                      Registered Office
                    </p>
                    <p className="text-gray-300">
                      {userData.address1}, {userData.address2}, {userData.city}, {userData.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg
                      className="w-4 h-4 text-black"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Phone</p>
                    <p className="text-gray-300">{userData.number}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-4 mt-1">
                    <svg
                      className="w-4 h-4 text-black"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg">Email</p>
                    <p className="text-gray-300">{userData.email}</p>
                  </div>
                </div>
                {userData.socials && (
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-4 mt-1">
                      <svg
                        className="w-4 h-4 text-black"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">Social Media</p>
                      <div className="flex space-x-4 mt-2">
                        {userData.socials.instagram && (
                          <a href={userData.socials.instagram} className="text-gray-300 hover:text-white">
                            Instagram
                          </a>
                        )}
                        {userData.socials.twitter && (
                          <a href={userData.socials.twitter} className="text-gray-300 hover:text-white">
                            Twitter
                          </a>
                        )}
                        {userData.socials.youtube && (
                          <a href={userData.socials.youtube} className="text-gray-300 hover:text-white">
                            YouTube
                          </a>
                        )}
                        {userData.socials.linkedin && (
                          <a href={userData.socials.linkedin} className="text-gray-300 hover:text-white">
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-10 rounded-3xl"
            >
              <form className="space-y-6">
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your investment goals..."
                  ></textarea>
                </div>
                <motion.button
                  type="submit"
                  className="w-full bg-white text-black px-6 py-4 rounded-xl text-lg font-bold hover:bg-gray-200 transition-all"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-white rounded-lg p-2 flex items-center justify-center mr-3">
                  <svg
                    className="w-8 h-8 text-black"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L13.5 8.5L20 7L14.5 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9.5 12L4 7L10.5 8.5L12 2Z" />
                  </svg>
                </div>
                <div className="flex-shrink-0">
                  <h3 className="text-2xl font-bold text-white">{userData.RegName}</h3>
                  <p className="text-xs text-gray-400">
                    SEBI REG: {userData.regNumber}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 mb-4 text-lg">
                SEBI Registered Research Analyst
              </p>
              <p className="text-gray-400">Registration No: {userData.regNumber}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-6 text-white">
                Contact Info
              </h4>
              <p className="text-gray-300 mb-3">
                {userData.address1}, {userData.address2}, {userData.city}, {userData.state}
              </p>
              <p className="text-gray-300 mb-3">Phone: {userData.number}</p>
              <p className="text-gray-300">Email: {userData.email}</p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-6 text-white">
                Important Links
              </h4>
              <div className="space-y-3">
                <p>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </p>
                <p>
                  <a
                    href="#"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Terms & Conditions
                  </a>
                </p>
                <p>
                  <a
                    href="https://scores.sebi.gov.in/"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    SEBI SCORES Portal
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="mb-4 text-gray-400">
              {userData.disclaimer || "Investment in securities market are subject to market risks, read all the related documents carefully before investing."}
            </p>
            <p className="text-gray-400">
              © {new Date().getFullYear()} {userData.RegName}. All rights reserved. Past performance may not
              be indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

