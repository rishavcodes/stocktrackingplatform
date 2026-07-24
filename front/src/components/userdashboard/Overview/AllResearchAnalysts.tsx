// app/marketplace/[id]/components/AllResearchAnalysts.tsx
"use client";

import { BadgeCheck, ShieldCheck,Eye, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
interface ResearchAnalyst {
  _id: string;
  RegName?: string;
  name?: string;
  companyName?: string;
  type?: string;
  verified?: boolean;
  profileUrl?: string;
  regNumber?: string;
}


interface AllResearchAnalystsProps {
  analysts: ResearchAnalyst[];
}

export function AllResearchAnalysts({ analysts }: AllResearchAnalystsProps) {
  const [duplicatedAnalysts, setDuplicatedAnalysts] = useState<ResearchAnalyst[]>([]);
  // console.log("this a anahjvhj",analysts)
useEffect(() => {
    // Create enough duplicates to fill the screen width
    const duplicates = [];
    for (let i = 0; i < 4; i++) {
      duplicates.push(...analysts);
    } 
    setDuplicatedAnalysts(duplicates);
  }, [analysts]);
  // If no analysts, show a message
  if (!analysts || analysts.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Research Analysts Coming Soon
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Our team of SEBI registered analysts are being onboarded. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  // Function to get analyst display name
  const getDisplayName = (analyst: ResearchAnalyst) => {
    const rawName = analyst.RegName || analyst.name || analyst.companyName || "Unknown Analyst";
    return rawName.replace(/_/g, ' ').trim();
  };

  // Function to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Create duplicated array for seamless scrolling
  

  
  return (
    <section className="py-10 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
         
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            All Research Analysts
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Browse through our complete roster of SEBI registered research analysts
          </p>
        </div>

        <div className="relative">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          {/* Marquee Container */}
          
        </div>

        {/* Alternative: Pure CSS Marquee (more reliable) */}
        <div className="relative mt-8">
          <div className="overflow-hidden py-6">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...analysts, ...analysts, ...analysts, ...analysts].map((analyst, index) => {
                const displayName = getDisplayName(analyst);
                const initials = getInitials(displayName);
                const sebiNumber = analyst.regNumber || "N/A";
                
                return (
                 
                  <Card
  key={`${analyst._id}-${index}`}
  className="group hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-blue-400 bg-white w-[320px] flex-shrink-0 mx-3 overflow-hidden relative"
>
  {/* Premium Gradient Header Strip */}
  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
  
 <CardContent className="p-4">
  <div className="flex items-center justify-between gap-4">
    {/* Left side - Name and SEBI */}

    <div className="relative flex-shrink-0">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden ring-2 ring-white/50 group-hover:ring-blue-200">
        {analyst.profileUrl ? (
          <img 
            src={analyst.profileUrl} 
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl font-bold">{initials}</span>
        )}
      </div>
      {/* Verified Badge */}
      {analyst.verified && (
        <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 ring-2 ring-white shadow-lg">
          <CheckCircle className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors truncate">
        {displayName}
      </h3>
      
      {/* SEBI Badge */}
      <div className="flex items-center gap-1.5 mt-2">
        <div className="inline-flex items-center gap-1.5    group-hover:border-blue-200 transition-colors">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-medium text-blue-700">
            SEBI: {sebiNumber}
          </span>
        </div>
      </div>
    </div>
    
    {/* Right side - Profile Image */}
    
  </div>
</CardContent>
</Card>
                );
              })}
            </div>
          </div>
        </div>

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
            <div className="text-3xl font-bold text-orange-600 mb-2">100Cr+</div>
            <div className="text-sm text-slate-600">Assets Managed</div>
          </div>
        </div>
      </div>
    
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-marquee {
          animation: marquee 40s linear infinite;
          width: max-content;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}