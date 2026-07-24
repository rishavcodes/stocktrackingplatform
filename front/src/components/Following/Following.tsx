"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useFetchFollowing } from "@/lib/data/Home/FollowingData";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setfollowingData } from "@/store/slices/followingData";

type SPTypes = {
  _id: string;
  type: string;
  category: string;
  RegName: string;
  regNumber: number;
  profileUrl: string;
  companyLogo: string;
  stats: { Followers: string[] };
  addedby: { companyName: string };
}[];

export default function Following() {
  const session = useSession();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const { data, isLoading, error, mutate } = useSWR<{ data: SPTypes }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getfollowing/details?id=${session.data?.user._id}&role=${session.data?.user.role}`,
    fetcher
  );

  const followingDataArray = useSelector(
    (state: RootState) => state.followingData
  );

  const { following, isError } = useFetchFollowing(
    session.data?.user._id || "",
    session.data?.user.role || "",
    Boolean(
      session.status === "authenticated" && followingDataArray.length === 0
    )
  );

  useEffect(() => {
    if (following) {
      dispatch(setfollowingData(following));
    }
  }, [following, dispatch]);

  async function UnFollow(targetId: string, name: string) {
    const initiatingId = session.data?.user._id;
    const role = session.data?.user.role;

    if (targetId === initiatingId) {
      toast({
        title: "Error",
        description: "You cant unfollow yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/unfollow`,
        {
          method: "POST",
          body: JSON.stringify({ targetId, initiatingId, role }),
          headers: { "Content-type": "application/json" },
        }
      );

      if (res.status === 200) {
        toast({
          title: "Success",
          description: `unfollowed ${name}`,
          variant: "default",
        });

        const newList = data?.data.filter((user) => user._id !== targetId);

        const newListStrings = followingDataArray.filter(
          (user) => user !== targetId
        );
        dispatch(setfollowingData(newListStrings));

        mutate({ data: newList || [] }, false);
      } else {
        toast({
          title: "Error",
          description: "Error Unfollowing User",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error Unfollowing User",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full h-full pt-10">
      <Toaster />
      <h1 className="text-[30px] px-5">
        Service Providers You Follow ({data?.data.length})
      </h1>
      <div className="mt-5 w-full flex flex-col">
        <table className="w-full border-collapse mt-5">
          <tbody className="w-full">
            {data?.data.map((sp) => (
              <tr
                key={sp._id}
                className="border-y border-black/20 dark:border-white/20"
              >
                <td className="flex gap-5 items-center py-3">
                  <Avatar className="h-20 w-20 cursor-pointer">
                    <AvatarImage
                      src={
                        sp.profileUrl !== "" ? sp.profileUrl : sp.companyLogo
                      }
                      alt="profile-avatar"
                    />
                    <AvatarFallback>
                      <Image
                        src={"/images/avatar/avatar.jpg"}
                        alt="avatar"
                        width={1280}
                        height={720}
                      />
                    </AvatarFallback>
                  </Avatar>
                  <span>{sp.RegName}</span>
                </td>
                <td className="text-blue font-medium">
                  SEBI reg. {sp.regNumber}
                </td>
                <td>
                  {sp.type !== "sub profile" ? (
                    sp.type
                  ) : (
                    <>
                      {sp.type} of <br /> {sp.addedby.companyName}{" "}
                    </>
                  )}
                </td>
                <td>
                  {sp.stats && sp.stats.Followers
                    ? sp.stats.Followers.length
                    : 0}{" "}
                  Followers
                </td>

                <td className="">
                  {followingDataArray.includes(sp._id) && (
                    <div
                      className="bg-red-500 px-5 py-2 cursor-pointer w-fit"
                      onClick={() => UnFollow(sp._id, sp.RegName)}
                    >
                      Unfollow
                    </div>
                  )}
                </td>
                <td>
                  <Link
                    href={`/view/serviceprovider/${sp._id}`}
                    className="bg-darkBlue text-white px-5 py-3 cursor-pointer"
                  >
                    View Profile
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
