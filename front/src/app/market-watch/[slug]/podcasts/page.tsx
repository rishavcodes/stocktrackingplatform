"use client";

import { Search } from "lucide-react";
import { ChangeEvent, useState, useEffect } from "react";
import { podcastType } from "@/lib/types";
import DateRangePicker from "../../DateRangePicker";
import { PodcastCard, LanguagesInput } from "@/components";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

export default function Articlepage({ params }: { params: Promise<{ slug: string }> }) {
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


  const { data, isLoading } = useSWR<{ data: podcastType }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/market-watch/podcasts?tag=${slug}&language=${languageBox.language}`,
    fetcher
  );

  const [search, setSearch] = useState<string>("");

  const [dateRange, setDateRange] = useState<string>("7");

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    const searchText = event.target.value.toLowerCase();
    setSearch(searchText);
  }
  return (
    <div className="">
      <div className="flex ss:flex-row flex-col items-center sm:justify-between justify-center max-sm:gap-5 sm:pr-10">
        <div className="flex md:gap-10 sm:gap-5 ss:gap-3 gap-5">
          <div>Podcasts</div>
          <div>Saved Podcasts</div>
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
        {data?.data
          .filter(
            (arr) =>
              arr.title.toLowerCase().includes(search) ||
              arr.authorData.name.toLowerCase().includes(search) ||
              arr.category.some((cat) =>
                cat.toLowerCase().includes(search.toLowerCase())
              )
          )
          .map((podcast) => {
            const createdDate = new Date(
              podcast.schedule === "Invalid Date"
                ? podcast.createdAt
                : podcast.schedule
            );

            const originalDate = new Date();
            originalDate.setDate(originalDate.getDate() - Number(dateRange));
            const formattedDate = originalDate.toISOString();

            if (new Date(formattedDate) > new Date(createdDate)) return;

            if (podcast.language !== languageBox.language) return;

            return (
              <PodcastCard
                key={podcast._id}
                title={podcast.title}
                description={podcast.description}
                link={podcast.link}
                category={podcast.category}
                image={podcast.image}
                tags={podcast.category}
                videoID={podcast.link}
                date={
                  podcast.schedule === "Invalid Date"
                    ? new Date(podcast.createdAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        }
                      )
                    : new Date(podcast.schedule).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                }
              />
            );
          })}
      </div>
    </div>
  );
}
