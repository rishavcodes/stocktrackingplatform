"use client";

import { EventCard } from "@/components";
import { eventType } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

async function fetchEvents(id: string): Promise<eventType[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allevents?id=${id}`,
      { 
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const { data } = await response.json();
      
      return data || [];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
}

function formatEventDateTime(schedule: string, createdAt: string) {
  const date = schedule !== "Invalid Date" ? new Date(schedule) : new Date(createdAt);
  
  const formattedDate = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(schedule !== "Invalid Date" && { weekday: "long" })
  });

  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  return { formattedDate, formattedTime };
}

export default function SPEventPage() {
  const params = useParams();
  const id = params?.id as string;
  const [eventData, setEventData] = useState<eventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchEvents(id);
        
        if (isMounted) {
          setEventData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load events");
          console.error("Error loading events:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!eventData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Events Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no events scheduled at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Events
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {eventData.length} event{eventData.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="space-y-6">
        {eventData.map((event) => {
          const { formattedDate, formattedTime } = formatEventDateTime(
            event.schedule, 
            event.createdAt
          );

          return (
            <EventCard
              key={event._id}
              id={event._id}
              price={event.price}
              date={formattedDate}
              time={formattedTime}
              category={event.category}
              title={event.title}
              author={event.authorData.name}
              authorId={event.authorData.id}
              description={event.description}
              email={event.eventEmail}
              link={event.link}
              location={event.location}
              image={event.image}
              tags={event.category}
              eventType={event.type}
              authorImage={event.authorData.authorImage}
              NoOfRegistration={event.NoOfRegistration}
            />
          );
        })}
      </div>
    </div>
  );
}