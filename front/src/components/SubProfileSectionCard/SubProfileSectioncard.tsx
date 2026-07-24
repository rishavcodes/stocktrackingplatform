"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { useSession } from "next-auth/react";

type SubProfileDataProps = {
  _id: string;
  category: string;
  RegName: string;
  profileUrl: string;
  verified: string;
  email: string;
  regNumber: string;
};

export default function SubProfileSectioncard() {
  const [data, setData] = useState<SubProfileDataProps[]>([]);

  const session = useSession();

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/subprofiles?id=${session.data?.user.id}`
      );

      if (res.status === 200) {
        const rawData = await res.json();
        setData(rawData.data);
      }
    })();
  }, []);

  return (
    <div className="mt-10 flex flex-col gap-5">
      <table className="table-auto">
        {data.map((user) => (
          <tr key={user._id}>
            <td className="py-5">
              <div className="flex gap-3 items-center">
                <Avatar className="h-20 w-20 cursor-pointer">
                  <AvatarImage src={user.profileUrl} alt="profile-avatar" />
                  <AvatarFallback>
                    {" "}
                    <Image
                      src={"/images/avatar/avatar.jpg"}
                      alt="avatar"
                      width={1280}
                      height={720}
                    />
                  </AvatarFallback>
                </Avatar>
              </div>
            </td>
            <td>{user.RegName}</td>
            <td>{user.regNumber}</td>
            <td>{user.category}</td>
            <td>{user.email}</td>
            <td>{user.verified ? "Verified" : "Not Verified"}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
