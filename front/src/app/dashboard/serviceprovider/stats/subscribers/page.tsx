import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

type subscriberDataType = {
  _id: string;
  name: string;
  role: string;
  profileUrl: string;
  plan: string;
  purchaseDate: string;
  validity: string;
  serviceName: string;
  email: string;
  number: string;
};

async function fetchSubscribers(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getsubscribers?id=${id}`
    );

    if (response.status !== 200) {
      return [];
    }

    const rawRes = await response.json();

    console.log("this is the purchase data: ", rawRes.data)

    return rawRes.data;
  } catch (error) {
    return [];
  }
}

export default async function page() {
  const session = await getServerSession(options);

  const subscribers: subscriberDataType[] = await fetchSubscribers(
    session?.user._id!
  );

  return (
    <div>
      <div className="ss:text-[40px] text-[30px] ss:w-full w-[90%] mx-auto mt-10">
        Subscribers ({subscribers.length})
      </div>

      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-b border-black/20 dark:border-white/20 text-left">
            <th className="py-3 px-5">Name</th>
            <th className="py-3 px-5">Email</th>
            <th className="py-3 px-5">Number</th>
            <th className="py-3 px-5">Plan</th>
            <th className="py-3 px-5">Purchase Date</th>
            <th className="py-3 px-5">Validity</th>
            <th className="py-3 px-5">KYC</th>
            <th className="py-3 px-5">Concent</th>
          </tr>
        </thead>
        <tbody className="w-full text-black dark:text-white">
          {subscribers.map((user, index) => (
            <tr
              key={`${user._id}-${user.plan}-${index}`}
              className="border-y border-black/20 dark:border-white/20"
            >
              <td className="py-3 px-5">{user.name}</td>
              <td className="py-3 px-5">{user.email}</td>
              <td className="py-3 px-5">{user.number}</td>
              <td className="py-3 px-5">{user.plan}</td>
              <td className="py-3 px-5">
                {new Date(user.purchaseDate).toLocaleDateString()}
              </td>
              <td className="py-3 px-5">
                {new Date(user.validity).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
