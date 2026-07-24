"use client";

import useSWR from "swr";
import { ServiceProviderTabs } from "..";
import fetcher from "@/lib/data/setup";
import { usePathname } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

const tabData = [
  {
    title: "All",
    href: "/dashboard/user/messages/all",
  },
  // {
  //   title: "Requests",
  //   href: "/dashboard/user/messages/requests",
  // },
];

export default function MessageTabs() {
  const pathname = usePathname();

  const { data } = useSWR<{
    data: { RegName: string; category: string; profileUrl: string };
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/messages/getprofile?id=${
      pathname.split("/conversation/")[1]
    }`,
    fetcher
  );

  return (
    <div>
      {pathname.includes("/conversation") ? (
        <div className="flex items-center gap-3 mt-5">
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage src={data?.data.profileUrl} alt="profile-avatar" />

            <AvatarFallback>
              <Image
                src={"/images/avatar/avatar.jpg"}
                alt="avatar"
                width={1280}
                height={720}
              />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="leading-4">{data?.data.RegName}</div>
            <div className="text-xs text-white/70">{data?.data.category}</div>
          </div>
        </div>
      ) : (
        <ServiceProviderTabs tabData={tabData} marginTop="mt-0" />
      )}
    </div>
  );
}
