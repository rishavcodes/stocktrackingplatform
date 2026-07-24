"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RootState } from "@/store/rootReducer";
import { useSelector } from "react-redux";

export default function AllMessages() {
  const session = useSession();
  const router = useRouter();
  const searchText = useSelector((state: RootState) => state.messagingSearch);

  const recipents = useSWR<{
    data: {
      _id: string;
      category: string;
      name: string;
      role: string;
      profileUrl: string;
    }[];
  }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/messages/search?id=${session.data?.user._id}&role=${session.data?.user.role}`,
    fetcher
  );

  return (
    <div className=" overflow-auto">
      <table className="w-full border-collapse mt-5">
        <tbody className="w-full text-black dark:text-white">
          {recipents.data?.data
            .filter((item) =>
              item.name.toLowerCase().startsWith(searchText.toLowerCase())
            )
            .map((user) => (
              <tr
                key={user._id}
                className="border-y border-black/20 dark:border-white/20 cursor-pointer"
                onClick={() =>
                  router.push(
                    `/dashboard/${
                      session.data?.user.role === "user"
                        ? "user"
                        : "serviceprovider"
                    }/messages/conversation/${user._id}`
                  )
                }
              >
                <td className="flex gap-5 items-center py-3">
                  <Avatar className="h-10 w-10 cursor-pointer">
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
                  <span>
                    {user.name} - ({user.role === "provider" && user.category})
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
