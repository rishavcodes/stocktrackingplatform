"use client";

import { OurServicesType } from "@/lib/types";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { ChangeEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PlansCard } from "@/components";
import { useGetServices } from "@/lib/data/ServiceProvider/services";

export default function MyPlans() {
  const session = useSession();

  const { services, isError, isLoading } = useGetServices(
    session.data?.user.id!
  );
  const { toast } = useToast();

  const [myPlans, setMyPlans] = useState<OurServicesType[]>(services || []);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (services !== undefined) {
      setMyPlans(services);
    }
  }, [services]);

  function showToast({
    title,
    description,
    variant,
  }: {
    title: string;
    description: string;
    variant: "default" | "destructive" | null | undefined;
  }) {
    toast({
      title,
      description,
      variant,
    });
  }

  function handleSearchUpdate(event: ChangeEvent<HTMLInputElement>) {
    const searchText = event.target.value.toLowerCase();
    setSearch(searchText);

    if (services === undefined) return;

    setMyPlans((prevPlans) => {
      const filtered: OurServicesType[] = prevPlans.filter((plan) =>
        plan.title.toLowerCase().includes(searchText)
      );
      return searchText === "" ? services || [] : filtered;
    });

    if (searchText === "") {
      setMyPlans(services);
    }
  }

  return (
    <div className="w-full bg-white flex flex-col gap-5 dark:bg-black p-5">
      <Toaster />
      {/* <div className="bg-lightGrey w-fit dark:bg-blackShade rounded-lg flex px-5 py-2 mr-[50px]">
        <input
          placeholder="Search"
          className="focus:outline-none bg-lightGrey  dark:bg-blackShade"
          onChange={handleSearchUpdate}
          value={search}
        />
        <Search className="cursor-pointer" />
      </div> */}
      <PlansCard
        myPlans={myPlans}
        gridLayout="md:p-5 p-3 grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5 gap-y-14"
        setMyPlans={setMyPlans}
        showToast={showToast}
      />
    </div>
  );
}
