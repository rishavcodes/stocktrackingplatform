"use client";

import { useFetchFollowing } from "@/lib/data/Home/FollowingData";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setfollowingData } from "@/store/slices/followingData";

export function FollowingDataFetch() {
  const dispatch = useDispatch();

  // console.log("fetched");

  const session = useSession();
  const followingDataArray = useSelector(
    (state: RootState) => state.followingData
  );

  const { following, isLoading, isError } = useFetchFollowing(
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

  return null;
}
