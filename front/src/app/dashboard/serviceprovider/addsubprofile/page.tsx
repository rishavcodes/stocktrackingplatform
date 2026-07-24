"use client";

import { useEffect, useState } from "react";
import { SubProfileSectioncard } from "@/components";
import { useSession } from "next-auth/react";

export default function AddSubprofile() {
  const [userId, setUserId] = useState<string>("");
  const [referString, setReferString] = useState<string>("");
  const [isCopied, setisCopied] = useState<boolean>(false);

  const session = useSession();

  useEffect(() => {
    (async () => {
      if (session.data?.user.type !== "Non Individual") {
        window.location.pathname = "/dashboard/serviceprovider/";
      }

      if (session.data?.user.id) {
        setUserId(session.data.user.id);
        setReferString(
          `${window.location.origin}/auth/signup/serviceprovider/subprofile/` +
            session.data.user.id
        );
      }
    })();
  }, []);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(referString);
    setisCopied(true);
  }

  return (
    <div className="pt-[50px] h-screen dark:text-white/70 w-full mx-auto">
      <div>Send this link for signing up as your subprofile</div>
      <div className="border border-green p-2 w-fit flex gap-2 items-center">
        <div className=" px-10 py-1 w-fit">
          {/* {`https://${window.location.hostname}/auth/signup/serviceprovider/${userId}`} */}
          {referString}
        </div>
        <div
          className="cursor-pointer bg-green-600 px-5 py-2 dark:text-black"
          onClick={copyToClipboard}
        >
          {isCopied ? "Copied" : "Copy Link"}
        </div>
      </div>
      <SubProfileSectioncard />
    </div>
  );
}
