"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { SpDesc } from "./SPDescData";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { useFetchFollowing } from "@/lib/data/Home/FollowingData";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setfollowingData } from "@/store/slices/followingData";
import { AnimatePresence } from "framer-motion";
import { ShareCard } from "@/components";
import ShareIcon from "@/icons/ShareIcon";
import Router, { useRouter } from "next/navigation";

export type SPTypes = {
  _id: string;
  type: string;
  category: string;
  RegName: string;
  regNumber: number;
  profileUrl: string;
  companyLogo: string;
  stats: {
    Followers: string[];
    contentStats?: {
      articles?: number;
      videos?: number;
      services?: number;
      events?: number;
      podcasts?: number;
    };
    Subscribers: string[];
  };
  addedby: { companyName: string };
};

const calculateTotalContent = (contentStats: {
  articles?: number;
  videos?: number;
  services?: number;
  events?: number;
  podcasts?: number;
}): number => {
  return (
    (contentStats?.articles ?? 0) +
    (contentStats?.videos ?? 0) +
    (contentStats?.services ?? 0) +
    (contentStats?.events ?? 0) +
    (contentStats?.podcasts ?? 0)
  );
};

export default function SPpage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { slug } = await params;
      setSlug(slug);
    };
    getId();
  }, [params]);
  const { data, error, isLoading } = useSWR<{ data: SPTypes[] }>(
    `${
      process.env.NEXT_PUBLIC_BACKEND_URL
    }/api/data/spbycategory?category=${decodeURI(slug)}`,
    fetcher
  );

  const router = useRouter();

  const session = useSession();
  const dispatch = useDispatch();

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

  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  const [isVisible, setIsVisible] = useState<string>("");

  useEffect(() => {
    if (following) {
      dispatch(setfollowingData(following));
    }
  }, [following, dispatch]);

  const { toast } = useToast();

  async function Follow(targetId: string, name: string) {
    const initiatingId = session.data?.user._id;
    const role = session.data?.user.role;

    if (targetId === initiatingId) {
      toast({
        title: "Error",
        description: "You cant follow yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/follow`,
        {
          method: "POST",
          body: JSON.stringify({
            targetId,
            initiatingId,
            role,
            targetName: name,
          }),
          headers: { "Content-type": "application/json" },
        }
      );

      if (res.status === 200) {
        toast({
          title: "Success",
          description: `Followed ${name}`,
          variant: "default",
        });

        const newList = [...followingDataArray, targetId];
        dispatch(setfollowingData(newList));
      } else {
        toast({
          title: "Error",
          description: "Error Following User",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error Following User",
        variant: "destructive",
      });
    }
  }

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

        const newList = followingDataArray.filter((user) => user !== targetId);
        dispatch(setfollowingData(newList));
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

  if (isLoading) {
    return (
      <div className="mt-20 min-h-screen bg-whiteShade dark:bg-blackShade">
        <div className="w-[90%] mx-auto">
          {" "}
          <h1 className=" text-center pt-10 text-[35px] font-light">
            Meet Our Experts!
          </h1>
          <p>{SpDesc[decodeURI(slug)]}</p>
          <div className="mt-5 font-medium">
            {decodeURI(slug)}
            {`(0)`}
          </div>
          <div>Loading....</div>
        </div>{" "}
      </div>
    );
  }

  return (
    <div className="mt-20 min-h-screen bg-whiteShade dark:bg-blackShade">
      <Toaster />

      <div className="w-[90%] mx-auto">
        {" "}
        <h1 className="text-center pt-10 text-[35px] font-light">
          Meet Our Experts!
        </h1>
        <div className="flex ss:flex-col flex-col-reverse max-ss:gap-10">
          <p className="ss:text-[14px] text-[13px]">
            {SpDesc[decodeURI(slug)]}
          </p>

          <div className="flex flex-col">
            <div className="mt-5 font-medium">
              {decodeURI(slug)}
              {`(${data?.data.length})`}
            </div>
            <div className="">
              <div className="w-full border-collapse mt-5 sm:text-[15px] ss:text-[14px] text-[13px]">
                <div className="w-full overflow-y-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {data?.data.map((sp) => (
                    <div
                      className="border rounded-lg border-black/20 dark:border-white/20 shadow-sm shadow-[#ffffff]"
                      key={sp._id}
                    >
                      <Link href={`/view/serviceprovider/${sp._id}/articles`}>
                        <div className="flex justify-between items-center py-3 px-4">
                          <div className="flex justify-start items-center gap-x-2">
                            <Avatar className="sm:h-20 ss:h-16 h-12 sm:w-20 ss:w-16 w-12 cursor-pointer">
                              <AvatarImage
                                src={
                                  sp.profileUrl !== ""
                                    ? sp.profileUrl
                                    : sp.companyLogo
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
                            <span className="whitespace-nowrap text-ellipsis pr-5">
                              {sp.RegName}
                              <br />
                              SEBI reg. {sp.regNumber}
                            </span>
                          </div>
                          <div>
                            <div
                              className="flex justify-between items-center mt-1 relative"
                              onClick={() => setIsVisible(sp._id)}
                              onMouseEnter={() => setIsVisible(sp._id)}
                              onMouseLeave={() => setIsVisible("")}
                            >
                              <ShareIcon
                                onClick={() => setIsVisible(sp._id)}
                                className="w-5 h-5 cursor-pointer mt-1"
                              />

                              <AnimatePresence>
                                {sp._id === isVisible && (
                                  <ShareCard
                                    title={`${sp.RegName} - `}
                                    separator="Read more at :-"
                                    url={`https://${hostname}/view/serviceprovider/${sp._id}`}
                                    // hashtags={event.tags}
                                  />
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="flex gap-x-2 py-2">
                        <div className="whitespace-nowrap text-ellipsis px-5">
                          {sp.stats && sp.stats.Followers
                            ? sp.stats.Followers.length
                            : 0}{" "}
                          Followers
                        </div>
                        <div className="whitespace-nowrap text-ellipsis px-5">
                          {sp.stats && sp.stats.Subscribers
                            ? sp.stats.Subscribers.length
                            : 0}{" "}
                          Subscribers
                        </div>
                      </div>
                      <hr className="mx-5 border-[1px]" />
                      <div className="py-2 px-5 flex justify-between items-center gap-x-2">
                        <div className="text-blue font-medium whitespace-nowrap text-ellipsis text-center">
                          {sp.stats && sp.stats.contentStats
                            ? sp.stats.contentStats?.articles
                            : 0}{" "}
                          Articles
                        </div>
                        <div className="text-blue font-medium whitespace-nowrap text-ellipsis text-center">
                          {sp.stats && sp.stats.contentStats
                            ? sp.stats.contentStats?.videos
                            : 0}{" "}
                          Videos
                        </div>
                        <div className="text-blue font-medium whitespace-nowrap text-ellipsis text-center">
                          {sp.stats && sp.stats.contentStats
                            ? sp.stats.contentStats?.events
                            : 0}{" "}
                          Events
                        </div>

                        {!followingDataArray.includes(sp._id) ? (
                          <div
                            className="bg-green px-5 py-2 cursor-pointer w-fit flex rounded-lg"
                            onClick={() => Follow(sp._id, sp.RegName)}
                          >
                            Follow
                          </div>
                        ) : (
                          <div
                            className="bg-red-500 px-5 py-2 cursor-pointer w-fit rounded-lg"
                            onClick={() => UnFollow(sp._id, sp.RegName)}
                          >
                            Unfollow
                          </div>
                        )}
                      </div>
                      {/* <div>
                        <Link
                          href={`/view/serviceprovider/${sp._id}`}
                          className="bg-darkBlue text-white px-5 py-3 cursor-pointer whitespace-nowrap text-ellipsis rounded-lg"
                        >
                          View Profile
                        </Link>
                      </div> */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
