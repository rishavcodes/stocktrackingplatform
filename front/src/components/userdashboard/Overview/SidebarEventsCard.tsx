"use client";

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock4, Users, UserPlus } from "lucide-react";

interface SidebarEventsCardProps {
  scrollToEvents: () => void;
}

export default function SidebarEventsCard({ scrollToEvents }: SidebarEventsCardProps) {
  // Hardcoded events data
  const events = [
    {
      _id: '1',
      title: "Market Outlook 2024",
      date: "Jan 30, 2024",
      time: "3:00 PM",
      type: "Webinar",
      speaker: "Nikhil Ajmera",
      registered: 245,
    },
    {
      _id: '2',
      title: "Options Trading Masterclass",
      date: "Feb 2, 2024",
      time: "6:00 PM",
      type: "Workshop",
      speaker: "Megha Shah",
      registered: 189,
    },
    {
      _id: '3',
      title: "Portfolio Rebalancing",
      date: "Feb 5, 2024",
      time: "11:00 AM",
      type: "Seminar",
      speaker: "Rahul Sharma",
      registered: 156,
    },
  ];

  // Helper function to format time
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Get days until event
  const getDaysUntil = (dateString: string) => {
    const [month, day, year] = dateString.split(' ')[1].split(',')[0].split('/');
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Past Event";
    return `in ${diffDays} days`;
  };

  return (
    <Card className="border-2 border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-700" />
          <CardTitle className="text-lg text-blue-800">Upcoming Events</CardTitle>
        </div>
        <CardDescription className="text-sm text-gray-600">
          Webinars, workshops & seminars
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-4">
          {events.map((event, index) => {
            const eventColors: Record<string, string> = {
              "webinar": "bg-blue-100 text-blue-700 border-blue-200",
              "workshop": "bg-emerald-100 text-emerald-700 border-emerald-200",
              "seminar": "bg-purple-100 text-purple-700 border-purple-200",
              "conference": "bg-amber-100 text-amber-700 border-amber-200",
              "masterclass": "bg-rose-100 text-rose-700 border-rose-200",
            };

            const eventTypeColor = eventColors[event.type.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
            const daysUntil = getDaysUntil(event.date);

            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer"
                onClick={() => console.log("View event:", event._id)}
              >
                <div className="flex items-start gap-3">
                  {/* Event Date Box */}
                  <div className="flex-shrink-0">
                    <div className="text-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-2 min-w-16">
                      <div className="text-lg font-bold">
                        {event.date.split(' ')[1].split(',')[0]}
                      </div>
                      <div className="text-xs font-medium">
                        {event.date.split(' ')[0]}
                      </div>
                    </div>
                    <div className="text-center mt-1">
                      <Badge className="text-xs bg-gray-100 text-gray-700">
                        {daysUntil}
                      </Badge>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                        {event.title}
                      </h4>
                      <Badge className={`text-xs ${eventTypeColor}`}>
                        {event.type}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays className="h-3 w-3" />
                        <span>{event.date}</span>
                        <span className="text-gray-300">•</span>
                        <Clock4 className="h-3 w-3" />
                        <span>{formatTime(event.time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Users className="h-3 w-3" />
                        <span>By {event.speaker}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <UserPlus className="h-3 w-3" />
                          <span>{event.registered.toLocaleString()} registered</span>
                        </div>
                        
                        {/* Registration Status */}
                        <Badge className="text-xs bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border-emerald-200">
                          {event.registered > 150 ? "Filling Fast" : "Open"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Event Statistics */}
        <div className="mt-4 space-y-3">
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Events:</span>
              <span className="font-bold text-blue-700">
                {events.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Upcoming:</span>
              <span className="font-bold text-emerald-700">
                {events.length}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Check regularly for new events
          </div>
        </div>

        {/* View All Button */}
        <div className="mt-4">
          <Button
            className="w-full font-semibold text-white transition-all bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600"
            onClick={scrollToEvents}
          >
            <span className="flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4" />
              View All Events
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}