"use client";

import { ChangeEvent } from "react";
import { Input } from "..";
import { RootState } from "@/store/rootReducer";
import { useDispatch } from "react-redux";
import { setMessageSearch } from "@/store/slices/messagingSearch";
import { useSelector } from "react-redux";

export default function SearchBoxMessaging() {
  const dispatch = useDispatch();

  const searchText = useSelector((state: RootState) => state.messagingSearch);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    dispatch(setMessageSearch(value));
  }

  return (
    <div className="relative">
      <Input
        title={"Search"}
        type={"text"}
        name={"search"}
        value={searchText}
        onChange={handleChange}
      />
    </div>
  );
}
