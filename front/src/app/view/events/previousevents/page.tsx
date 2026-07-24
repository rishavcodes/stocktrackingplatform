"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { EventCard } from "@/components";
import { DateRange } from "react-day-picker";
import { useDataEvents } from "@/lib/data/Home/EventDataHome";

export default function PreviousEvents() {
  const [selectedDateRange, setselectedDateRange] = useState<
    DateRange | undefined
  >();

  const { events } = useDataEvents();

  return (
    <div className="flex min-h-screen dark:bg-blackShade md:flex-row flex-col pt-5 pb-10 w-full mx-auto justify-center">
      <Calendar
        mode="range"
        selected={selectedDateRange}
        onSelect={setselectedDateRange}
        className="rounded-md border"
      />

      <div className="w-[60%] p-6 flex flex-col border-2 gap-y-4">
        {events?.map((event, idx) => {
          const eventDate = new Date(event.schedule);
          const eventDateDay = eventDate.getDate();

          if (new Date() < eventDate) return;

          if (selectedDateRange?.from) {
            if (!selectedDateRange.to) {
              if (
                selectedDateRange.from === selectedDateRange.to ||
                selectedDateRange.from.getDate() !== eventDateDay
              ) {
                return;
              }
            } else if (selectedDateRange.to) {
              const fromDay = selectedDateRange.from.getDate();
              const toDay = selectedDateRange.to.getDate();

              if (!(fromDay <= eventDateDay && eventDateDay <= toDay)) {
                return;
              }
            }
          }

          return (
            // <EventCard
            //   key={event._id}
            //   id={event._id}
            //   date={new Date(event.schedule).toLocaleDateString(undefined, {
            //     weekday: "long",
            //     year: "numeric",
            //     month: "short",
            //     day: "2-digit",
            //   })}
            //   time={
            //     new Date(event.schedule)
            //       .toLocaleDateString(undefined, {
            //         hour: "2-digit",
            //         minute: "2-digit",
            //         hour12: true,
            //       })
            //       .split(",")[1]
            //   }
            //   category={event.category}
            //   title={event.title}
            //   author={event.authorData.name}
            //   authorId={event.authorData.id}
            //   description={event.description}
            //   email={event.eventEmail}
            //   // className={`${
            //   //   idx === events.length - 1
            //   //     ? ""
            //   //     : "border-b border-black border-dotted"
            //   // }`}
            //   link={event.link}
            //   location={event.location}
            //   image={event.image}
            //   tags={event.category}
            //   eventType={event.eventType}
            //   authorImage={event.authorData.authorImage}
            //   NoOfRegistration={event.NoOfRegistration}
            // />
            <></>
          );
        })}
      </div>
    </div>
  );
}
