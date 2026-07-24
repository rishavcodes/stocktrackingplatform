"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

export default function PrevConvos() {
  const session = useSession();

  const { data } = useSWR<{
    data: { _id: string; name: string; profileUrl: string; role: string }[];
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/messages/getprevconvos?id=${session.data?.user._id}`,
    fetcher
  );

  return (
    <div className="flex flex-col gap-5">
      <div>Previous Conversations ({data?.data.length})</div>
      {data?.data.map((user) => (
        <Link
          href={`/dashboard/${
            session.data?.user.role === "user" ? "user" : "serviceprovider"
          }/messages/conversation/${user._id}`}
          key={user._id}
          className="flex items-center gap-5 border p-2 w-full cursor-pointer"
        >
          <Avatar className="w-10 h-10 aspect-square cursor-pointer">
            <AvatarImage src={user.profileUrl} alt="profile-avatar" />

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
            <div className="text-base leading-3">{user.name}</div>
            {user.role === "provider" && (
              <div className="text-white/70 text-sm">Research Analyst</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
