"use client";

import { OurServicesType } from "@/lib/types";
import { formatCallQuotaLabel } from "@/lib/formatCallQuota";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { motion } from "framer-motion";
import ShareIcon from "@/icons/ShareIcon";

type ServiceCardProps = {
  servicesArray: OurServicesType[];
  gridLayout?: string;
  /** Richer styling for dashboard lists (e.g. My Subscribed Services) */
  variant?: "default" | "featured";
};

export default function ServiceCard({
  servicesArray,
  gridLayout = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  variant = "default",
}: ServiceCardProps) {
  const router = useRouter();
  const isFeatured = variant === "featured";

  return (
    <div className={gridLayout}>
      {servicesArray.map((service, idx) => (
        <motion.div
          key={service._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.05 }}
          className={
            isFeatured
              ? "group bg-white dark:bg-[#161616] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-md hover:shadow-xl hover:border-indigo-300/60 dark:hover:border-indigo-800/80 transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.04]"
              : "bg-white dark:bg-[#1E1E1E] rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden"
          }
          onClick={() => router.push(`/view/services/${service._id}`)}
        >
          {/* ---------- Banner ---------- */}
          <div className="relative h-[160px] w-full overflow-hidden bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900">
            {service.bannerURL ? (
              <Image
                src={service.bannerURL}
                alt={service.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : null}
            {isFeatured && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            )}
            <span
              className={
                isFeatured
                  ? "absolute top-3 right-3 bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border border-white/20"
                  : "absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full"
              }
            >
              {service.segment?.toUpperCase() || "—"}
            </span>
            {isFeatured && (
              <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md">
                {service.serviceType === "fund" ? "Fund" : "Plan"}
              </span>
            )}
          </div>

          {/* ---------- Content ---------- */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h2
              className={
                isFeatured
                  ? "text-lg font-semibold line-clamp-2 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                  : "text-lg font-semibold line-clamp-2 dark:text-white"
              }
            >
              {service.title}
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {service.description}
            </p>

            {formatCallQuotaLabel(service.callsQuota, service.callsPeriod) && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {formatCallQuotaLabel(service.callsQuota, service.callsPeriod)}
              </p>
            )}

            {/* Key Features */}
            {service.keyFeatures?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {service.keyFeatures.slice(0, 3).map((f, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[#E8F7FF] dark:bg-[#2C2C2C] text-[#0369A1] dark:text-white px-3 py-1 rounded-full"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            {/* Author */}
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={service.authorData.authorImage} />
                <AvatarFallback>
                  <Image
                    src="/images/avatar/avatar.jpg"
                    alt="avatar"
                    width={40}
                    height={40}
                  />
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-sm font-medium dark:text-white">
                  {service.authorData.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SEBI Registered
                </p>
              </div>
            </div>
          </div>

          {/* ---------- Footer ---------- */}
          <div
            className={
              isFeatured
                ? "border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-black/20 p-4 flex items-center justify-between gap-3"
                : "border-t dark:border-gray-700 p-4 flex items-center justify-between"
            }
          >
            <div>
              {service.serviceType === "normal" && service.validity && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Validity: {service.validity} days
                </p>
              )}

              {service.price ? (
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ₹{Math.round(service.price)}
                </p>
              ) : (
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Subscribed
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isFeatured && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mr-1 hidden sm:inline">
                  View →
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.share?.({
                    title: service.title,
                    url: `${window.location.origin}/view/services/${service._id}`,
                  });
                }}
                className={
                  isFeatured
                    ? "p-2 rounded-full hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    : "p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                }
              >
                <ShareIcon />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
