import { SPstats } from "@/components/Home/OurFamily/OurFamily";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import InstagramIcon from "@/icons/InstagramIcon";
import LinkedinIcon from "@/icons/LinkedinIcon";
import TwitterXIcon from "@/icons/TwitterXIcon";
import YoutubeIcon from "@/icons/YoutubeIcon";
import Image from "next/image";
import Link from "next/link";

type SpdetailsProps = {
  SPData: SPstats;
};

export default function Spdetails({ SPData }: SpdetailsProps) {
  const {
    profileUrl,
    companyLogo,
    RegName,
    category,
    regNumber,
    description,
    socials
  } = SPData;

  const displayImage = profileUrl || companyLogo;
  const hasSocials = socials && Object.values(socials).some(url => url && url !== "");

  return (
    <section className="bg-white dark:bg-gray-900 border-b  border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="flex flex-col md:flex-row items-center gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Avatar Section */}
          <div className="flex-shrink-0 ">
            <div className="relative">
              <Avatar className="w-48 h-48 md:w-56  md:h-56 lg:w-64 lg:h-64 border-4 border-white dark:border-gray-800 shadow-xl rounded-2xl">
                <AvatarImage
                  src={displayImage}
                  alt={RegName} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
                  <div className="flex items-center justify-center w-full h-full">
                    <Image
                      src="/images/avatar/avatar.jpg"
                      alt="Default avatar"
                      width={256}
                      height={256}
                      className="object-cover w-full h-full rounded-2xl"
                      priority
                    />
                  </div>
                </AvatarFallback>
              </Avatar>
              {/* Verified Badge */}
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 text-center md:text-left space-y-6">
            {/* Header with Name and Social Links */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-4">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {RegName}
                </h1>
                
              </div>

              {/* Category */}
              <h2 className="text-xl sm:text-2xl text-blue-600 dark:text-blue-400 font-semibold">
                {category}
              </h2>
            </div>

            {/* SEBI Registration Badge */}
            <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 px-6 py-3 rounded-2xl shadow-sm">
              <div className="bg-blue-600 p-2 rounded-lg mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                SEBI Registration Number:{" "}
                <span className="font-bold text-blue-800 dark:text-blue-200">{regNumber}</span>
              </span>
            </div>

            {/* Description */}
            <div className="max-w-3xl">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg sm:text-xl">
                {description}
              </p>
            </div>

            
            
          </div>
        </div>
      </div>
    </section>
  );
}

// Social Link Component
function SocialLink({ 
  href, 
  children, 
  ariaLabel 
}: { 
  href: string; 
  children: React.ReactNode; 
  ariaLabel: string;
}) {
  return (
    <Link
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      aria-label={ariaLabel}
      className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600 dark:hover:from-pink-600 dark:hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-sm"
    >
      {children}
    </Link>
  );
}