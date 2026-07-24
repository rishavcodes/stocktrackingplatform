"use client";

import {
  EventsAndVideos,
  Hero,
  OurFamily,
  TrendingArticles,
  FeaturesHome,
  ControlledSphere,
  RegionalLanguages,
  PMSOverview,
  PlansCard,
  ServiceCard,
  Footer,
} from "@/components";

import { motion } from "framer-motion";
import { ThemeProvider } from "next-themes"; 
 
import MarketUpdates from "@/components/MarketUpdates/marketupdates";
import ExpertRecommendations from "@/components/Home/ExpertRecommendations/ExpertRecommendations";
import TopPlans from "@/components/Home/TopPlans/TopPlans";
import TrendingVideos from "@/components/Home/TrendingVideos/TrendingVideos";

import WhyChooseUs from "@/components/Home/WhyChooseUs/WhyChooseUs";
import BookDemo from "@/components/Home/BookDemoSection/BookDemo";
import Testimonial from "@/components/Home/Testimonial/Testimonial";
import IntegrationSection from "@/components/Home/IntegrationSection/IntegrationSection";
import FeaturesSection from "@/components/Home/FeaturesSection/FeaturesSection";
import StatsSection from "@/components/Home/StatsSection";
import CombinedWhoWeServeTestimonials from "@/components/Home/CombinedWhoWeServeTestimonials";
import OnboardingStepsSection from "@/components/Home/OnboardingStepsSection";
import PowerfulIntegrationsSection from "@/components/Home/PowerfulIntegrationsSection";
import FAQSection from "@/components/Home/FAQSection";
import HeroSection from "@/components/Home/Hero/Hero";

export default function Home() {
  return ( 
    <div className="font-montserrat text-[#1A1A1A] bg-[#F4F4F4]">
    
        <HeroSection/> 
        <FeaturesSection /> 
        {/* <StatsSection /> */}
        <CombinedWhoWeServeTestimonials />
        <OnboardingStepsSection />
        <PowerfulIntegrationsSection />
        <FAQSection />
        <Footer /> 
       
    </div>
  );
}
