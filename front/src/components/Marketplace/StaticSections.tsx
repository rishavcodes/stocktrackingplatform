import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Radio,
  ChevronRight,
  Award,
  Menu,
  Play,
  ChevronDown,
  LogIn,
  RefreshCw,
  EyeOff,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle,
  Clock4,
  Download,
  Eye,
  BadgeCheck,
  Facebook,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  Heart,
  Instagram,
  Layers,
  Linkedin,
  MailIcon,
  MapPinIcon,
  Phone,
  PlayCircle,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingDownIcon,
  TrendingUp,
  TrendingUpIcon,
  Trophy,
  Twitter,
  Users,
  Users2,
  UserPlus,
  Wallet,
  Youtube,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";


 export function CategoryGrid() {
  const router = useRouter();
  const params = useParams();
  const marketplaceId = params?.slug as string || "";

  const categories = [
    {
      icon: TrendingUp,
      title: "Live Trading Ideas",
      description: "Real-time trading ideas",
      count: "245+",
      color: "bg-green-100 text-green-700",
      gradient: "from-green-400 to-emerald-500",
      delay: 0,
      route: "recommendations",
    },
    {
      icon: Users,
      title: "Research Analysts",
      description: "SEBI registered experts",
      count: "48",
      color: "bg-blue-100 text-blue-700",
      gradient: "from-blue-400 to-cyan-500",
      delay: 0.1,
      route: "experts",
    },
    {
      icon: Briefcase,
      title: "Model Portfolios",
      description: "Curated strategies",
      count: "32",
      color: "bg-purple-100 text-purple-700",
      gradient: "from-purple-400 to-violet-500",
      delay: 0.2,
      route: "portfolio",
    },
    {
      icon: FileText,
      title: "Services",
      description: "Best Services",
      count: "156+",
      color: "bg-orange-100 text-orange-700",
      gradient: "from-orange-400 to-amber-500",
      delay: 0.3,
      route: "services",
    },
    {
      icon: CalendarDays,
      title: "Events & Webinars",
      description: "Live learning sessions",
      count: "18",
      color: "bg-pink-100 text-pink-700",
      gradient: "from-pink-400 to-rose-500",
      delay: 0.4,
      route: "events",
    },
    {
      icon: Layers,
      title: "Courses",
      description: "Personalized Courses",
      count: "24",
      color: "bg-indigo-100 text-indigo-700",
      gradient: "from-indigo-400 to-blue-500",
      delay: 0.5,
      route: "lms",
    },
  ];

  // Animated background dots
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
    hover: {
      y: -10,
      scale: 1.02,
      transition: {
        duration: 0.2,
      },
    },
    tap: {
      scale: 0.98,
    },
  };

  const iconVariants = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.1,
      rotate: 5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  };

  const countVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.1,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      transition: {
        type: "spring",
        stiffness: 400,
      },
    },
  };

  const buttonVariants = {
    rest: { x: 0 },
    hover: { 
      x: 5,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-16 relative overflow-hidden">
      {/* Animated background dots */}
      <div className="absolute inset-0 -z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gray-300 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Explore Our Services
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Discover comprehensive financial solutions designed for every investor
          </p>
        </motion.div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {categories.map((category, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            whileHover="hover"
            whileTap="tap"
            custom={index}
          >
            <Card className="border border-gray-200 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300 h-full overflow-hidden relative group">
              {/* Animated border effect */}
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                   style={{ 
                     backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                     
                   }}
              />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    variants={iconVariants}
                    initial="rest"
                    whileHover="hover"
                    className={`p-3 rounded-xl bg-gradient-to-br ${category.gradient} shadow-md`}
                  >
                    <category.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  
                  <motion.div
                    variants={countVariants}
                    initial="rest"
                    whileHover="hover"
                  >
                    <Badge className={`${category.color} border-0 font-semibold px-3 py-1`}>
                      {category.count}
                    </Badge>
                  </motion.div>
                </div>
                
                <h3 className="font-bold text-xl mb-3 text-gray-900 group-hover:text-gray-800 transition-colors">
                  {category.title}
                </h3>
                
                <p className="text-gray-600 mb-5 leading-relaxed">
                  {category.description}
                </p>
                
                <motion.div
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                >
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto font-medium group/btn"
                    onClick={() => {
                      if (marketplaceId) router.push(`/marketplace/${marketplaceId}/${category.route}`);
                    }}
                  >
                    <span className="relative">
                      <span className="text-blue-600 group-hover/btn:text-blue-700 transition-colors">
                        Explore Now
                      </span>
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover/btn:w-full transition-all duration-300" />
                    </span>
                    <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </CardContent>

              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{
                     background: `radial-gradient(circle at center, ${category.gradient.split(' ')[0].replace('from-', '')}20, transparent 70%)`,
                   }}
              />
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Animated bottom border */}
      <motion.div
        className="mt-12 pt-8 border-t border-gray-200"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-gray-500 text-sm"
          >
            All services are provided by SEBI registered research analysts
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

// Top Performers Section (from first codebase)
 export function TopPerformers() {
  const performers = [
    {
      name: "Reliance Industries",
      symbol: "RELIANCE",
      price: "₹2,845",
      change: "+2.4%",
      trend: "up",
      volume: "4.2M",
    },
    {
      name: "TCS",
      symbol: "TCS",
      price: "₹3,850",
      change: "+1.8%",
      trend: "up",
      volume: "1.8M",
    },
    {
      name: "Infosys",
      symbol: "INFY",
      price: "₹1,560",
      change: "-0.8%",
      trend: "down",
      volume: "2.3M",
    },
    {
      name: "HDFC Bank",
      symbol: "HDFCBANK",
      price: "₹1,680",
      change: "+3.2%",
      trend: "up",
      volume: "5.1M",
    },
    {
      name: "ICICI Bank",
      symbol: "ICICIBANK",
      price: "₹1,120",
      change: "+1.5%",
      trend: "up",
      volume: "3.7M",
    },
    {
      name: "Bharti Airtel",
      symbol: "BHARTIARTL",
      price: "₹1,350",
      change: "+0.9%",
      trend: "up",
      volume: "2.1M",
    },
    {
      name: "SBI",
      symbol: "SBIN",
      price: "₹820",
      change: "+2.1%",
      trend: "up",
      volume: "6.3M",
    },
    {
      name: "Wipro",
      symbol: "WIPRO",
      price: "₹520",
      change: "-1.2%",
      trend: "down",
      volume: "1.5M",
    },
  ];

  // Duplicate for seamless loop
  const duplicatedPerformers = [...performers, ...performers];

  return (
    <div className="container mx-auto px-4 py-12 bg-gray-50 rounded-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Top Performing Stocks</h2>
          <p className="text-gray-600">Today&apos;s market movers</p>
        </div>
        <Button variant="outline">View Market Analysis</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Market Data with scrolling animation */}
        <Card className="border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Market Data</CardTitle>
                <CardDescription>Real-time updates</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xl font-bold text-gray-900">LIVE</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative h-[400px] overflow-hidden">
              {/* Fade gradients */}
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
              
              {/* Scrolling container */}
              <motion.div
                className="space-y-2"
                animate={{
                  y: [0, -100 * performers.length], // Adjust based on item count
                }}
                transition={{
                  y: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: performers.length * 3,
                    ease: "linear",
                  },
                }}
              >
                {duplicatedPerformers.map((stock, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stock.trend === 'up' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                        {stock.trend === 'up' ? (
                          <TrendingUpIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDownIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{stock.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">{stock.symbol}</p>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">Vol: {stock.volume}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{stock.price}</p>
                      <p className={`text-sm font-medium ${stock.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stock.change}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex items-center justify-center w-full">
              
            </div>
          </CardFooter>
        </Card>

        {/* Market Insights Card (unchanged) */}
        <Card className="border">
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
            <CardDescription>Expert analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-700">Nifty 50</span>
                </div>
                <p className="text-sm text-gray-600">
                  Trading near all-time high with strong institutional buying.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Sector Watch</span>
                </div>
                <p className="text-sm text-gray-600">
                  IT and Banking sectors showing strong momentum this week.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock4 className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-700">Upcoming Events</span>
                </div>
                <p className="text-sm text-gray-600">
                  RBI policy meeting scheduled for next week. Market expects status quo.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Detailed Analysis
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// How It Works Section (from first codebase)
 export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Browse Services",
      description: "Explore Trading Ideas, portfolios, and advisory services",
      icon: Search,
      color: "#3B82F6",
    },
    {
      number: "02",
      title: "Choose Expert",
      description: "Select from SEBI registered research analysts",
      icon: Users,
      color: "#10B981",
    },
    {
      number: "03",
      title: "Subscribe & Invest",
      description: "Subscribe to services and start investing",
      icon: Wallet,
      color: "#8B5CF6",
    },
    {
      number: "04",
      title: "Track Performance",
      description: "Monitor your investments with real-time updates",
      icon: TrendingUp,
      color: "#F59E0B",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const stepVariants = {
    hidden: { 
      opacity: 0, 
      y: 30 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const numberVariants = {
    hidden: { scale: 0 },
    visible: {
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
  };

  const lineVariants = {
    hidden: { width: 0 },
    visible: {
      width: "100%",
      transition: {
        duration: 0.8,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-block mb-4"
        >
          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-full border border-blue-100">
            <span className="text-blue-600 font-medium">Step-by-Step Process</span>
          </div>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
        >
          How It Works
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-600 max-w-2xl mx-auto"
        >
          Start your investment journey in four simple steps
        </motion.p>
      </div>

      {/* Steps Container */}
      <div className="relative">
        {/* Connecting Line - Desktop Only */}
        <div className="hidden lg:block absolute top-12 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5">
          <motion.div
            variants={lineVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="h-full bg-gradient-to-r from-blue-500 via-green-500 via-purple-500 to-orange-500 rounded-full"
          />
        </div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative"
            >
              {/* Step Number with Animation */}
              <div className="flex justify-center mb-6">
                <motion.div
                  variants={numberVariants}
                  className="relative"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {/* Background Glow */}
                  <motion.div
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{ backgroundColor: step.color }}
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  
                  {/* Number Circle */}
                  <div 
                    className="relative h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.number}
                  </div>
                </motion.div>
              </div>

              {/* Step Content */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: `${step.color}10`,
                      color: step.color
                    }}
                  >
                    <step.icon className="h-6 w-6" />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 
                  className="text-lg font-semibold text-center mb-3"
                  style={{ color: step.color }}
                >
                  {step.title}
                </h3>
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Progress Indicator */}
                <div className="mt-6 flex justify-center">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((num) => (
                      <div
                        key={num}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          num === index + 1 
                            ? 'w-6' 
                            : 'w-2'
                        }`}
                        style={{
                          backgroundColor: num === index + 1 
                            ? step.color 
                            : '#E5E7EB',
                          opacity: num === index + 1 ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrow Indicator (Desktop Only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 -right-4">
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Testimonials Section (from first codebase)
 export function Testimonials() {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Portfolio Manager",
      content: "The quality of research and timely Trading Ideas have helped us achieve consistent returns.",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "Individual Investor",
      content: "Excellent platform with transparent pricing and professional service providers.",
      rating: 5,
    },
    {
      name: "Amit Patel",
      role: "Financial Advisor",
      content: "A game-changer for accessing expert financial advice. Highly recommended!",
      rating: 4,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          What Our Clients Say
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Join thousands of satisfied investors who trust our platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <Card key={index} className="border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                      }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 mb-6 italic">&apos;{testimonial.content}&apos;</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Professional Footer (from first codebase)
 export function ProfessionalFooter({ footerConfig }: { footerConfig?: import("./types").FooterConfig }) {
  type SocialKey = "facebook" | "instagram" | "linkedin" | "twitter" | "threads" | "youtube";

  const socialIcons: { key: SocialKey; Icon: typeof Facebook; label: string }[] = [
    { key: "facebook", Icon: Facebook, label: "Facebook" },
    { key: "instagram", Icon: Instagram, label: "Instagram" },
    { key: "linkedin", Icon: Linkedin, label: "LinkedIn" },
    { key: "twitter", Icon: Twitter, label: "Twitter" },
    { key: "threads", Icon: Globe2, label: "Threads" },
    { key: "youtube", Icon: Youtube, label: "YouTube" },
  ];

  const activeSocials = footerConfig?.socials
    ? socialIcons.filter(({ key }) => footerConfig.socials?.[key])
    : [];

  const appLinks = footerConfig?.appLinks;
  const hasAppLinks = appLinks?.googlePlay || appLinks?.appStore || appLinks?.webApp;

  const sections = footerConfig?.sections?.filter((s) => s.title && s.links?.length > 0) || [];
  const support = footerConfig?.support;
  const hasSupport = support?.phone || support?.email || support?.queryLink;

  // Determine grid columns based on content
  const columnCount = 1 + sections.length + (hasSupport ? 1 : 0);
  const gridClass =
    columnCount <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : columnCount <= 3
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <footer className="bg-gray-100 text-black">
      <div className="container mx-auto px-4 py-12">
        <div className={`grid ${gridClass} gap-8`}>
          {/* Column 1: Branding + Socials + App Links */}
          <div>
            {footerConfig?.poweredByVisible !== false && (
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-sm">Powered By</h3>
                </div>
                <div>
                  <Image
                    src="/images/logo/fulllogo.png"
                    alt="TradeBox"
                    width={180}
                    height={180}
                  />
                </div>
              </div>
            )}

            {activeSocials.length > 0 && (
              <>
                <h4 className="font-semibold mb-3 text-sm">Be Social With Us</h4>
                <div className="flex gap-3 mb-4">
                  {activeSocials.map(({ key, Icon, label }) => (
                    <a
                      key={key}
                      href={footerConfig!.socials![key]!}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={label}
                    >
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </a>
                  ))}
                </div>
              </>
            )}

            {hasAppLinks && (
              <>
                <h4 className="font-semibold mb-3 text-sm">Download Our App</h4>
                <ul className="space-y-2">
                  {appLinks?.googlePlay && (
                    <li>
                      <a href={appLinks.googlePlay} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black transition-colors text-sm flex items-center gap-2">
                        <Download className="h-3 w-3" /> Google Play
                      </a>
                    </li>
                  )}
                  {appLinks?.appStore && (
                    <li>
                      <a href={appLinks.appStore} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black transition-colors text-sm flex items-center gap-2">
                        <Download className="h-3 w-3" /> App Store
                      </a>
                    </li>
                  )}
                  {appLinks?.webApp && (
                    <li>
                      <a href={appLinks.webApp} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-black transition-colors text-sm flex items-center gap-2">
                        <Globe2 className="h-3 w-3" /> Web App
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}

          </div>

          {/* Dynamic Sections (About, Partner With Us, etc.) */}
          {sections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) =>
                  link.label ? (
                    <li key={linkIdx}>
                      {link.url ? (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <span className="text-gray-500">{link.label}</span>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ))}


          {/* Customer Support */}
          {hasSupport && (
            <div>
              <h4 className="font-semibold mb-4">Customer Support</h4>
              <ul className="space-y-3">
                {support?.phone && (
                  <li className="flex items-center gap-2 text-gray-500">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${support.phone}`} className="hover:text-black transition-colors">
                      {support.phone}
                    </a>
                  </li>
                )}
                {support?.email && (
                  <li className="flex items-center gap-2 text-gray-500">
                    <MailIcon className="h-4 w-4" />
                    <a href={`mailto:${support.email}`} className="hover:text-black transition-colors">
                      {support.email}
                    </a>
                  </li>
                )}
                {support?.queryLink && (
                  <li className="flex items-center gap-2 text-gray-500">
                    <FileText className="h-4 w-4" />
                    <a href={support.queryLink} target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">
                      Raise a Query
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}

        </div>

        <Separator className="my-8 bg-gray-800" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            {footerConfig?.copyrightText
              ? footerConfig.copyrightText
              : `\u00A9 ${new Date().getFullYear()} TradeBox Marketplace. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}

// Add this new component after the CategoryGrid component

export function TrustedByRAs() {
  const analysts = [
    { name: "ICICI Securities", logo: "🏦", sebiReg: "INZ000183631" },
    { name: "Motilal Oswal", logo: "📊", sebiReg: "INZ000158836" },
    { name: "HDFC Securities", logo: "🏛️", sebiReg: "INZ000186937" },
    { name: "Kotak Securities", logo: "🏢", sebiReg: "INZ000200137" },
    { name: "Axis Securities", logo: "📈", sebiReg: "INZ000161633" },
    { name: "Sharekhan", logo: "💼", sebiReg: "INZ000171337" },
    { name: "Angel One", logo: "👼", sebiReg: "INZ000161534" },
    { name: "Zerodha", logo: "⚡", sebiReg: "INZ000031633" },
    { name: "Upstox", logo: "🚀", sebiReg: "INZ000031731" },
    { name: "5paisa", logo: "💰", sebiReg: "INZ000163238" },
    { name: "Edelweiss", logo: "🌟", sebiReg: "INZ000005231" },
    { name: "Religare", logo: "🔷", sebiReg: "INZ000174937" },
  ];

  // Duplicate the array for seamless loop
  const duplicatedAnalysts = [...analysts, ...analysts];

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-4">
            <BadgeCheck className="w-4 h-4" />
            <span className="text-sm font-semibold">SEBI Registered</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Leading Research Analysts
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Partnered with India&apos;s top SEBI registered research analysts and financial institutions
          </p>
        </div>

        <div className="relative">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div className="overflow-hidden py-6">
            <motion.div
              className="flex gap-6"
              animate={{
                x: [0, -50 * analysts.length * 16], // Adjust multiplier based on card width
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: analysts.length * 3, // Adjusted duration for horizontal
                  ease: "linear",
                },
              }}
            >
              {duplicatedAnalysts.map((analyst, index) => (
                <Card
                  key={index}
                  className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 bg-white min-w-[280px] flex-shrink-0"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                        {analyst.logo}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                          {analyst.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <ShieldCheck className="w-3 h-3 text-green-600" />
                          <span className="truncate">SEBI: {analyst.sebiReg}</span>
                        </div>
                      </div>

                      {/* Verified Badge */}
                      <div className="flex-shrink-0">
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span className="text-xs font-semibold">Verified</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Alternative: Grid layout (non-scrolling) */}
        {/* Uncomment this if you prefer a static grid instead of scrolling */}
        {/*
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {analysts.map((analyst, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border hover:border-blue-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-2xl">
                    {analyst.logo}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{analyst.name}</h4>
                    <p className="text-xs text-slate-500">SEBI: {analyst.sebiReg}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        */}

        {/* Stats section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">48+</div>
            <div className="text-sm text-slate-600">Registered Analysts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
            <div className="text-sm text-slate-600">SEBI Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">10K+</div>
            <div className="text-sm text-slate-600">Active Investors</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">₹500Cr+</div>
            <div className="text-sm text-slate-600">Assets Managed</div>
          </div>
        </div>
      </div>
    </section>
  );
}