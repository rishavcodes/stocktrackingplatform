"use client";

import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect } from "react";
import { EventCard } from "@/components";
import { DateRange } from "react-day-picker";
import { useDataEventsApproved, useDataEvents } from "@/lib/data/Home/EventDataHome";

export default function UpcomingEventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>();

  const [selectedDateRange, setselectedDateRange] = useState<
    DateRange | undefined
  >();

  const { events } = useDataEvents();

  const approvedEvents = events?.filter(event => event?.approvalStatus === true);

  // Get the event dates
//   const eventDates = events?.map(event => {
//   const eventDate = new Date(event.schedule);
//   return new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
// }) || [];

  return (
    <div className="flex items-center md:items-start min-h-screen md:flex-row flex-col w-full mx-auto justify-center">
      <Calendar
        mode="range"
        selected={selectedDateRange}
        onSelect={setselectedDateRange}
        className="rounded-md border "
      />

      <div className="md:w-[60%] p-4 sm:p-8 md:p-6 m-5 md:m-0 flex flex-col border-2 gap-y-4">
        {approvedEvents?.map((event:any, idx) => {
          const eventDate = new Date(event.schedule);
          const eventDateDay = eventDate.getDate();

          if (new Date() > eventDate) return;

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
            //   date={
            //     event.schedule === "Invalid Date"
            //       ? new Date(event.createdAt).toLocaleDateString(undefined, {
            //           year: "numeric",
            //           month: "short",
            //           day: "2-digit",
            //         })
            //       : new Date(event.schedule).toLocaleDateString(undefined, {
            //           weekday: "long",
            //           year: "numeric",
            //           month: "short",
            //           day: "2-digit",
            //         })
            //   }
            //   time={
            //     event.schedule === "Invalid Date"
            //       ? new Date(event.createdAt)
            //           .toLocaleDateString(undefined, {
            //             hour: "2-digit",
            //             minute: "2-digit",
            //             hour12: true,
            //           })
            //           .split(",")[1]
            //       : new Date(event.schedule)
            //           .toLocaleDateString(undefined, {
            //             hour: "2-digit",
            //             minute: "2-digit",
            //             hour12: true,
            //           })
            //           .split(",")[1]
            //   }
            //   category={event.category}
            //   title={event.title}
            //   author={event.authorData.name}
            //   authorId={event.authorData.id}
            //   description={event.description}
            //   email={event.eventEmail}
            //   // className={`${
            //   //   idx === approvedEvents.length - 1
            //   //     ? ""
            //   //     : "border-b border-black border-dotted"
            //   // }`}
            //   link={event.link}
            //   location={event.location}
            //   image={event.image}
            //   tags={event.category}
            //   eventType={event.eventType}
            //   authorImage={event.authorData.authorImage}
            //   NoOfRegistration={event?.NoOfRegistration}
            // />
            <></>
          );
        })}
      </div>
    </div>
  );
}
