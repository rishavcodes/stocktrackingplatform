import { SPstats } from "@/components/Home/OurFamily/OurFamily";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import InstagramIcon from "@/icons/InstagramIcon";
import LinkedinIcon from "@/icons/LinkedinIcon";
import TwitterXIcon from "@/icons/TwitterXIcon";
import YoutubeIcon from "@/icons/YoutubeIcon";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ShieldCheck, MapPin } from "lucide-react";

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
    socials,
    stats,
    topExchange,
  } = SPData;

  const totalRecs = stats?.recommendationStats?.total ?? 0;
  const totalArticles = stats?.contentStats?.articles ?? 0;
  const totalPlans = stats?.contentStats?.services ?? 0;
  const totalCourses = stats?.courseStates?.totalCourses ?? 0;
  const totalEvents = stats?.contentStats?.events ?? 0;
  const totalPortfolios = stats?.modelPortfolioStates?.totalPortfolios ?? 0;
  const totalPackages = (stats as any)?.packageStats?.totalPackages ?? 0;

  const displayImage = profileUrl || companyLogo;
  const hasSocials =
    socials && Object.values(socials).some((url) => url && url !== "");
  const location = (SPData as any).city
    ? [(SPData as any).city, (SPData as any).state].filter(Boolean).join(", ")
    : "";

  const socialLinks = [
    { key: "instagram", href: socials?.instagram, label: "Instagram", Icon: InstagramIcon },
    { key: "twitter",   href: socials?.twitter,   label: "X (Twitter)", Icon: TwitterXIcon },
    { key: "youtube",   href: socials?.youtube,   label: "YouTube",     Icon: YoutubeIcon },
    { key: "linkedin",  href: socials?.linkedin,  label: "LinkedIn",    Icon: LinkedinIcon },
  ].filter((s) => s.href && s.href !== "");

  return (
    <section className="bg-slate-50 dark:bg-[#090f1e]">
      <div className="container mx-auto px-2 sm:px-0">
        <div className="w-full mx-auto">
          {/* ── Main card ─────────────────────────────────────── */}
          <div className="relative bg-white dark:bg-white/[0.03] border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Hero section with tinted background */}
            <div className="relative bg-green-50">
              <div className="w-full flex flex-col md:flex-row md:justify-between items-center gap-6 md:gap-8 px-6 sm:px-8 lg:px-10 py-6 md:py-8">

                {/* ── left: Identity column ─────────────────── */}
                <div className="flex-col w-fit justify-center text-[#2a2b3f]">
                  {/* Category eyebrow label */}
                  <p className="text-lg font-semibold uppercase tracking-[0.15em]">
                    {category}
                  </p>

                  {/* Name + verified */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold tracking-tight leading-[1.1]">
                      {RegName}
                    </h1>
                    <BadgeCheck className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" stroke="white" strokeWidth={2.5} />
                  </div>

                  {/* Description as tagline */}
                  {description && (
                    <p className="text-sm sm:text-base mt-2 line-clamp-2 max-w-2xl leading-relaxed">
                      {description}
                    </p>
                  )}

                  {/* Location · SEBI line */}
                  <div className="flex items-center gap-3 mt-3 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {location}
                      </span>
                    )}
                    {location && regNumber && <span className="text-slate-300">·</span>}
                    {regNumber && (
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-medium text-slate-600 dark:text-slate-300">SEBI REG NO:</span>
                        <span className="font-medium">{regNumber}</span>
                      </span>
                    )}
                  </div>

                  {/* Stats strip — compact bar at the bottom of the card */}
                  <div className="mt-4 border-t border-slate-200 py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-6">
                      <StatItem label="Trading Ideas" value={totalRecs} />
                      <StatItem label="Top Segment" value={topExchange || "—"} isText />
                      <StatItem label="Articles" value={totalArticles} />
                      <StatItem label="Plans" value={totalPlans} />
                      <StatItem label="Portfolios" value={totalPortfolios} />
                      <StatItem label="Packages" value={totalPackages} />
                      <StatItem label="Courses" value={totalCourses} />
                      <StatItem label="Events" value={totalEvents} />
                    </div>
                  </div>
                </div>


                {/* ── right: Avatar card-within-a-card ─────────────────── */}
                <div className="flex-shrink-0 flex justify-center md:justify-start">
                  <div className="bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-sm px-5 py-5 md:px-16 md:py-12 flex flex-col items-center gap-4 w-fit">
                    <Avatar className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full border border-slate-100 dark:border-white/10 shadow-sm">
                      <AvatarImage src={displayImage} alt={RegName} className="object-cover" />
                      <AvatarFallback className="rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        <Image
                          src="/images/avatar/avatar.jpg"
                          alt="Default avatar"
                          width={256}
                          height={256}
                          className="object-cover w-full h-full rounded-full"
                          priority
                        />
                      </AvatarFallback>
                    </Avatar>

                    {/* Social icons under avatar */}
                    {hasSocials && (
                      <div className="flex items-center gap-2">
                        {socialLinks.map(({ key, href, label, Icon }) => (
                          <SocialLink key={key} href={toAbsolute(href!)} ariaLabel={label}>
                            <Icon className="w-6 h-6" />
                          </SocialLink>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>


          </div>
        </div>
      </div>
    </section>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toAbsolute(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function StatItem({
  label,
  value,
  isText,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-none">
        {isText
          ? (typeof value === "string" ? value : String(value))
          : Number(value).toLocaleString()}
      </div>
      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
        {label}
      </div>
    </div>
  );
}

function SocialLink({
  href,
  ariaLabel,
  children,
}: {
  href: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="
        p-2
        bg-white dark:bg-white/[0.05]
        border border-gray-200 dark:border-white/[0.08]
        rounded-xl
        text-gray-500 dark:text-gray-400
        hover:text-blue-600 dark:hover:text-blue-400
        hover:border-blue-300 dark:hover:border-blue-600/60
        hover:bg-blue-50 dark:hover:bg-blue-500/10
        hover:-translate-y-0.5
        hover:shadow-md hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30
        transition-all duration-200
      "
    >
      {children}
    </Link>
  );
}