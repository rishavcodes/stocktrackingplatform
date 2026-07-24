"use client";
import { useState, useEffect } from "react";
import { EventCard, PostRemovalBox } from "@/components";
import { eventType } from "@/lib/types";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";

export default function Eventpage({ params }: { params: Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");
    
      useEffect(() => {
        const getId = async () => {
          const { id } = await params;
          setId(id);
        };
        getId();
      }, [params]);
  const { data } = useSWR<{ data: eventType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allevents?id=${id}`,
    fetcher
  );

  const session = useSession();

  return (
    <div className=" pl-10 items-stretch pt-10 w-full h-full">
      <Toaster />
      <Link
        href={`/dashboard/admin/serviceprovider/${id}`}
        className=" bg-green px-5 py-3"
      >
        Back
      </Link>

      <div className="flex flex-col relative flex-wraps gap-5 mt-10">
        {data?.data.map((event) => (
          <div
            key={event._id}
            className="flex justify-center relative items-stretch"
          >
            <PostRemovalBox
              id={event._id}
              type="removeevent"
              token={session.data?.user.backendToken!}
            />

            {/* <EventCard
              key={event._id}
              id={event._id}
              date={
                event.schedule === "Invalid Date"
                  ? new Date(event.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })
                  : new Date(event.schedule).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                    })
              }
              time={
                event.schedule === "Invalid Date"
                  ? new Date(event.createdAt)
                      .toLocaleDateString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .split(",")[1]
                  : new Date(event.schedule)
                      .toLocaleDateString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                      .split(",")[1]
              }
              category={event.category}
              title={event.title}
              author={event.authorData.name}
              authorId={event.authorData.id}
              description={event.description}
              email={event.eventEmail}
              link={event.link}
              location={event.location}
              // image={event?.image}
              tags={event.category}
              eventType={event.eventType}
              authorImage={event.authorData.authorImage}
              NoOfRegistration={event.NoOfRegistration}
            /> */}
          </div>
        ))}
      </div>
    </div>
  );
}
