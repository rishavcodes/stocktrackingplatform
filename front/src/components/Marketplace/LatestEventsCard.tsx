"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { TabType } from "./types";
import { buildProductUrl } from "@/lib/customDomain";

interface LatestEventsCardProps {
  tabData: { [key in TabType]?: { data: any[]; loading: boolean } };
  onTabClick?: (tab: TabType) => void;
  marketplaceSlug?: string;
}

export default function LatestEventsCard({ tabData, onTabClick, marketplaceSlug }: LatestEventsCardProps) {
  const allEvents = tabData.events?.data || [];
  const now = new Date();
  const upcomingEvents = allEvents.filter((e: any) => new Date(e.schedule) >= now);
  const total = upcomingEvents.length;

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total]);

  const event = upcomingEvents[current];

  return (
    <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-bold text-slate-900">Upcoming Events</CardTitle>
          </div>
          {total > 1 && (
            <span className="text-[10px] text-slate-400 font-medium tabular-nums">{current + 1} / {total}</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <div className="relative overflow-hidden min-h-[140px]">
          <AnimatePresence mode="wait">
            {event ? (
              <motion.div
                key={event._id || current}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <Link href={buildProductUrl("events", event._id, event.authorData)} className="block group">
                  <div className="space-y-2">
                    {/* Banner */}
                    <div className="relative h-24 w-full rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600">
                      {event.image ? (
                        <img src={event.image} alt={event.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <CalendarDays className="h-8 w-8 text-white/50" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge className="text-[9px] px-1.5 py-0 font-medium border-0 bg-white/90 text-purple-700">
                          {event.eventType || "Event"}
                        </Badge>
                        {event.price === 0 && (
                          <Badge className="text-[9px] px-1.5 py-0 font-medium border-0 bg-emerald-500 text-white">
                            FREE
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {event.title}
                    </h4>

                    {/* Date + Price + Register */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <CalendarDays className="h-3 w-3 flex-shrink-0" />
                        <span>
                          {new Date(event.schedule).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" at "}
                          {new Date(event.schedule).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      </div>
                      {event.price > 0 && (
                        <span className="text-[11px] font-bold text-purple-700">₹{event.price}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <div className="py-6 text-center">
                <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs font-medium">No upcoming events</p>
                <p className="text-gray-400 text-[10px] mt-0.5">Check back soon</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* View All */}
        <div className="mt-3">
          {marketplaceSlug ? (
            <Link href={`/marketplace/${marketplaceSlug}/events`}>
              <Button variant="outline" className="w-full h-8 text-xs font-semibold text-purple-600 border-purple-200 hover:bg-purple-50">
                View All Events
              </Button>
            </Link>
          ) : (
            <Button variant="outline" className="w-full h-8 text-xs font-semibold text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => onTabClick?.("events")}>
              View All Events
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
