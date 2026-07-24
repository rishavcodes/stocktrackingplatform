"use client";
import BellIcon from "@/icons/BellIcon";
import SideRectangleIcon from "@/icons/SideRectangleIcon";
import { motion } from "framer-motion";
import Link from "next/link";
import { google } from "calendar-link";
import { useDataEvents } from "@/lib/data/Home/EventDataHome";

export default function Events() {
  const { events } = useDataEvents();

  return (
    <div className=" bg-white dark:bg-darkGrey/20 rounded-2xl pb-5 w-full font-jakarta">
      <h1 className="text-center text-[25px] rounded-t-2xl py-5 bg-green/30 dark:bg-SPcardUpperBlackShade font-bold text-darkGreen dark:text-green">
        Events
      </h1>
      <div className="flex flex-col gap-5 mt-5 overflow-auto h-[300px] w-full scrollbar-thumb-rounded-full scrollbar-thin scrollbar-track-rounded-full scrollbar-thumb-darkGrey/60">
        {events?.map((event, idx) => {
          const eventData = {
            title: event.title,
            description: event.description,
            start: `${event.schedule}`,
            location: event.location ? event.location : event.link,
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                delay: idx < 4 ? 0.2 * idx + 0.2 : 0.2,
                duration: 0.5,
                stiffness: 70,
                type: "spring",
              }}
              key={event._id}
              className={` justify-start items-center py-5 flex ss:flex-row bg-darkGrey/10 dark:bg-darkGrey/30 dark:hover:bg-black hover:bg-blue/20 w-[90%] mx-auto rounded-2xl cursor-pointer`}
            >
              <SideRectangleIcon />

              <div className="flex w-full justify-between px-5">
                <div className="flex flex-col">
                  <div className="text-darkGrey font-semibold dark:text-white/70">
                    {event.schedule === "Invalid Date"
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
                          .split(",")[1]}
                  </div>
                  <div className="text-darkGrey dark:text-white/60 font-semibold mt-1">
                    {event.schedule === "Invalid Date"
                      ? new Date(event.createdAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          }
                        )
                      : new Date(event.schedule).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                  </div>
                  <div className="text-darkGrey/70 dark:text-white/50 font-semibold">
                    {event.title.split(" ").slice(0, 10).join(" ") + "...."}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border-l-2 pl-5 border-darkGrey/20">
                  <div className="flex ss:items-center gap-2 items-center ss:flex-row flex-col ss:justify-between justify-start">
                    <div className="flex gap-2 flex-wrap w-fit justify-center">
                      <div className="text-darkGrey dark:text-white/60 font-semibold text-[13px]">
                        {event.eventType}
                      </div>

                      <div className="flex flex-col gap-1">
                        {event.category.map((tag) => (
                          <Link
                            key={tag}
                            href={`/market-watch/${tag}/events`}
                            className=" bg-darkGrey text-[12px] px-3 rounded-sm text-white cursor-pointer"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <BellIcon
                      className="w-10 h-10"
                      onClick={() => {
                        window.open(google(eventData));
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
