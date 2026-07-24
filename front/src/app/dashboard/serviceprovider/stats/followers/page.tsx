import { options } from "@/app/api/auth/[...nextauth]/options";
import { userType } from "@/lib/types";
import { getServerSession } from "next-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

async function fetchFollowers(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getfollowers?id=${id}`
    );

    if (response.status !== 200) {
      return [];
    }

    const rawRes = await response.json();

    return rawRes.data;
  } catch (error) {
    return [];
  }
}

export default async function page() {
  const session = await getServerSession(options);

  const followers: userType[] = await fetchFollowers(session?.user._id!);

  // console.log(followers);

  return (
    <div>
      <div className="ss:text-[40px] text-[30px] ss:w-full w-[90%] mx-auto mt-10">
        Followers ({followers.length})
      </div>

      <table className="w-full border-collapse mt-5">
        <tbody className="w-full text-black dark:text-white">
          {" "}
          {followers.map((user) => (
            <tr
              key={user._id}
              className="border-y border-black/20 dark:border-white/20"
            >
              <td className="flex gap-5 items-center py-3">
                <Avatar className="h-20 w-20 cursor-pointer">
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
                  {user.name} ({user.role})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
