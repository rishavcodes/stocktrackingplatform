"use client";

import { useState, useMemo } from "react";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import EventCard from "@/components/Cards/EventCard/EventsCard";

export type EventType = {
    _id: string;
    title: string;
    description: string;
    image?: string;
    schedule: string;
    eventType: string;
    link?: string;
    price: number;
};

export default function Event() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

    const { data, isLoading } = useSWR<{ data: EventType[] }>(
        session?.user?.id
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/events/enrolled?userId=${session.user.id}`
            : null,
        fetcher
    );

    const { upcoming, past } = useMemo(() => {
        const now = new Date();
        const upcoming: EventType[] = [];
        const past: EventType[] = [];

        data?.data?.forEach((event) => {
            if (new Date(event.schedule) >= now) {
                upcoming.push(event);
            } else {
                past.push(event);
            }
        });

        upcoming.sort((a, b) => new Date(a.schedule).getTime() - new Date(b.schedule).getTime());
        past.sort((a, b) => new Date(b.schedule).getTime() - new Date(a.schedule).getTime());

        return { upcoming, past };
    }, [data]);

    const events = activeTab === "upcoming" ? upcoming : past;

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
            {/* Tabs */}
            <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                    onClick={() => setActiveTab("upcoming")}
                    className={`shrink-0 px-4 sm:px-5 h-9 rounded-full text-sm font-medium transition ${
                        activeTab === "upcoming"
                            ? "bg-primary text-primary-foreground shadow"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                    Upcoming {!isLoading && `(${upcoming.length})`}
                </button>
                <button
                    onClick={() => setActiveTab("past")}
                    className={`shrink-0 px-4 sm:px-5 h-9 rounded-full text-sm font-medium transition ${
                        activeTab === "past"
                            ? "bg-primary text-primary-foreground shadow"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                    Past {!isLoading && `(${past.length})`}
                </button>
            </div>

            {/* Content Card */}
            <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
                {isLoading ? (
                    /* Skeleton Loader */
                    <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-44 sm:h-48 md:h-52 rounded-lg bg-muted animate-pulse"
                            />
                        ))}
                    </div>
                ) : events.length ? (
                    <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
                        {events.map((event) => (
                            <EventCard key={event._id} event={event} />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
                        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📅</div>
                        <h3 className="text-base sm:text-lg font-semibold">
                            {activeTab === "upcoming"
                                ? "No upcoming events"
                                : "No past events"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                            {activeTab === "upcoming"
                                ? "You don’t have any upcoming events. Once you register for one, it’ll appear here."
                                : "You don’t have any past events yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

