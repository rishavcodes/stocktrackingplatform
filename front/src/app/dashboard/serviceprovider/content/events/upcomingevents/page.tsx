"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DateRange } from "react-day-picker";
import { eventType } from "@/lib/types";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ShareCard } from "@/components";
import ShareIcon from "@/icons/ShareIcon";
import { useToast } from "@/components/ui/use-toast";
import {
  CalendarDays,
  Clock,
  MapPin,
  IndianRupee,
  Users,
  Eye,
  Globe,
  Building2,
  Sparkles,
} from "lucide-react";

function getRegistrationCount(event: eventType): number {
  return (
    Number((event as any).registrationCount) ||
    Number(event.NoOfRegistration) ||
    event.registeredUsers?.length ||
    0
  );
}

export default function UpcomingEvents() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();
  const [eventData, setEventData] = useState<eventType[]>([]);
  const [isVisible, setIsVisible] = useState<string>("");
  const { data: session } = useSession();
  const { toast } = useToast();

  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  useEffect(() => {
    (async () => {
      if (session?.user.id) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allevents?id=${session.user.id}`,
          { method: "GET" }
        );
        if (response.status === 200) {
          const rawData = await response.json();
          setEventData(rawData.data);
        }
      }
    })();
  }, [session]);

  // Show only upcoming events (schedule strictly in the future), sorted by
  // soonest first. Optional date-range filter narrows further.
  const now = Date.now();
  const filteredEvents = eventData
    .filter((event) => new Date(event.schedule).getTime() > now)
    .filter((event) => {
      const eventDate = new Date(event.schedule);
      if (!selectedDateRange?.from) return true;

      if (selectedDateRange.from && !selectedDateRange.to) {
        return eventDate.toDateString() === selectedDateRange.from.toDateString();
      }

      if (selectedDateRange.from && selectedDateRange.to) {
        return (
          eventDate >= selectedDateRange.from && eventDate <= selectedDateRange.to
        );
      }

      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.schedule).getTime() - new Date(b.schedule).getTime()
    );

  return (
    <div className="flex flex-col md:flex-row gap-6 mb-10">
      <div className="flex-1 space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-gray-600 dark:text-gray-300">
            No upcoming events.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventImage = (event as any).image as string | undefined;
            const eventDate = new Date(event.schedule);
            const isPaid = !!event.price && Number(event.price) > 0;
            const evType = (event as any).eventType as string | undefined;
            const registered = getRegistrationCount(event);

            // Days-until calculation for the highlight pill
            const msToEvent = eventDate.getTime() - Date.now();
            const daysToEvent = Math.ceil(msToEvent / (1000 * 60 * 60 * 24));
            const isToday = daysToEvent === 0;
            const isThisWeek = daysToEvent > 0 && daysToEvent <= 7;

            return (
              <div
                key={event._id}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Banner — left, full bleed */}
                  {eventImage ? (
                    <div className="relative w-full lg:w-56 h-48 lg:h-auto flex-shrink-0">
                      <Image
                        src={eventImage}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 224px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/30 via-transparent to-transparent lg:from-transparent lg:via-transparent lg:to-white/0 dark:lg:to-gray-900/0" />
                      {/* Status pill on the banner */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${
                            isToday
                              ? "bg-red-500/90 text-white"
                              : isThisWeek
                                ? "bg-amber-500/90 text-white"
                                : "bg-emerald-500/90 text-white"
                          }`}
                        >
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                          </span>
                          {isToday
                            ? "Today"
                            : daysToEvent === 1
                              ? "Tomorrow"
                              : `In ${daysToEvent} days`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full lg:w-56 h-48 lg:h-auto flex-shrink-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 dark:from-blue-600 dark:via-indigo-700 dark:to-purple-800 flex items-center justify-center">
                      <CalendarDays className="w-14 h-14 text-white/40" />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${
                            isToday
                              ? "bg-red-500/90 text-white"
                              : isThisWeek
                                ? "bg-amber-500/90 text-white"
                                : "bg-emerald-500/90 text-white"
                          }`}
                        >
                          {isToday
                            ? "Today"
                            : daysToEvent === 1
                              ? "Tomorrow"
                              : `In ${daysToEvent} days`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="flex-1 min-w-0 flex flex-col lg:flex-row p-5 gap-4">
                    {/* Title + Stats */}
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {evType && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-900/50">
                                {evType === "Online" && <Globe className="w-3 h-3" />}
                                {evType === "Offline" && <Building2 className="w-3 h-3" />}
                                {evType === "Hybrid" && <Sparkles className="w-3 h-3" />}
                                {evType}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${
                                isPaid
                                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50"
                                  : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50"
                              }`}
                            >
                              {isPaid ? `₹${event.price}` : "Free"}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {event.title}
                          </h3>
                          {event.category && event.category.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {event.category.join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Inline icon stats */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <InlineStat
                          icon={<CalendarDays className="w-4 h-4 text-blue-500" />}
                          value={eventDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        />
                        <InlineStat
                          icon={<Clock className="w-4 h-4 text-sky-500" />}
                          value={eventDate.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        />
                        <InlineStat
                          icon={<MapPin className="w-4 h-4 text-rose-500" />}
                          value={event.location || "Online"}
                        />
                        <InlineStat
                          icon={<Users className="w-4 h-4 text-purple-500" />}
                          value={`${registered} registered`}
                        />
                        {isPaid && (
                          <InlineStat
                            icon={<IndianRupee className="w-4 h-4 text-emerald-500" />}
                            value={`₹${event.price}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[150px] lg:justify-center">
                      <Link
                        href={`/view/events/details/${event._id}`}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>

                      <div
                        className="relative group/share flex-1 lg:flex-none"
                        onMouseEnter={() => setIsVisible(event._id)}
                        onMouseLeave={() => setIsVisible("")}
                      >
                        <button className="w-full inline-flex items-center justify-center gap-2 px-4 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 transition">
                          <ShareIcon className="w-4 h-4" />
                          Share
                        </button>
                        <AnimatePresence>
                          {event._id === isVisible && (
                            <div className="absolute right-0 bottom-full mb-2 z-20">
                              <ShareCard
                                title={event.title}
                                separator="Check this event:"
                                url={`https://${hostname}/view/events/details/${event._id}`}
                              />
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const InlineStat = ({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string | number | undefined;
}) => (
  <div className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300 min-w-0">
    <span className="flex-shrink-0">{icon}</span>
    <span className="font-medium truncate">{value}</span>
  </div>
);
