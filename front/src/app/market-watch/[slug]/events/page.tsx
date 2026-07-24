"use client";

import { EventCard, LanguagesInput } from "@/components";
import PodcastCard from "@/components/PodcastCard/PodcastCard";
import { Search } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { eventType } from "@/lib/types";
import DateRangePicker from "../../DateRangePicker";

async function getData(tag: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/market-watch/events?tag=${tag}`,
    { method: "GET" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const fetchedRes = await res.json();

  return fetchedRes.data;
}

export default function Eventpage({ params }: { params: Promise<{ slug: string }> }) {
  const [eventArr, seteventArr] = useState<eventType[]>([]);
  const [eventArrInit, seteventArrInit] = useState<eventType[]>([]);
  const [search, setSearch] = useState<string>("");

  const [dateRange, setDateRange] = useState<string>("7");
  const [languageBox, setLanguage] = useState<{ language: string }>({
    language: "english",
  });
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { slug } = await params;
      setSlug(slug);
    };
    getId();
  }, [params]);

  useEffect(() => {
    (async () => {
      const data: eventType[] = await getData(slug);

      seteventArr(data);
      seteventArrInit(data);
    })();
  }, [slug]);

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    const searchText = event.target.value.toLowerCase();

    setSearch(searchText);

    const filtered: eventType[] = eventArrInit.filter(
      (arr) =>
        arr.title.toLowerCase().includes(searchText) ||
        arr.authorData.name.toLowerCase().includes(searchText) ||
        arr.category.some((cat) =>
          cat.toLowerCase().includes(searchText.toLowerCase())
        )
    );

    seteventArr(filtered);

    if (searchText === "") {
      seteventArr(eventArrInit);
    }
  }

  return (
    <div>
      <div className="flex ss:flex-row flex-col items-center sm:justify-between justify-center max-sm:gap-5 sm:pr-10">
        <div className="flex md:gap-10 sm:gap-5 ss:gap-3 gap-5">
          <div>Events</div>
          <div>Saved Events</div>
        </div>

        <div className="relative flex xs:flex-row flex-col-reverse items-center md:gap-5 gap-3">
          <div className="flex items-center gap-3">
            <DateRangePicker
              onChange={setDateRange}
              value={dateRange}
              title="Filter"
              name="date"
              width="w-fit gap-1"
            />

            <LanguagesInput
              onChange={setLanguage}
              value={languageBox.language}
              title={"Select language"}
              name={"language"}
              width="w-fit gap-1"
            />
          </div>

          <div className="relative bg-white">
            <input
              placeholder="Search"
              className="pl-5 py-2 outline-none md:w-fit xs:w-[140px] w-full"
              type="text"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <Search className="absolute xs:right-2 right-5 top-2" />
        </div>
      </div>

      <div className="flex gap-5 mt-10 flex-wrap w-full">
        {eventArr.map((event, idx) => {
          if (new Date() < new Date(event.schedule)) return;

          const createdDate = new Date(
            event.schedule === "Invalid Date" ? event.createdAt : event.schedule
          );

          const originalDate = new Date();
          originalDate.setDate(originalDate.getDate() - Number(dateRange));
          const formattedDate = originalDate.toISOString();

          if (new Date(formattedDate) > new Date(createdDate)) return;

          if (event.language !== languageBox.language) return;

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
            //   className={`${
            //     idx === eventArr.length - 1
            //       ? ""
            //       : "border-b border-black border-dotted"
            //   }`}
            //   link={event.link}
            //   location={event.location}
            //   tags={event.category}
            //   eventType={event.type}
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
