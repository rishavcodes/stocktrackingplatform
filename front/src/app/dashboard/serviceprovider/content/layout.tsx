import { options } from "@/app/api/auth/[...nextauth]/options";
import { ServiceProviderStatCards, ServiceProviderWelcome } from "@/components";
import { authFetch } from "@/lib/authFetch";
import { getServerSession } from "next-auth";

async function fetchDisclaimer(id: string, token: string) {
  try {
    const rawRes = await authFetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/disclaimer?id=${id}`,
      {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        method: "GET"
      }
    );

    if (rawRes.status !== 200) {
      return "";
    }

    const res = await rawRes.json();

    return res.data;
  } catch (error) {
    // console.log(error);
    return "";
  }
}

async function fetchSPStats(id: string, token: string) {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spstats?id=${id}`,
    {
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "GET"
    }
  );

  if (response.status !== 200) {
    return {
      followers: 0,
      following: 0,
      events: 0,
      subscribers: 0,
      leads: 0,
    };
  }

  const rawRes = await response.json();

  return rawRes.data;
}

export default async function Providerlayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(options);
  // console.log("backend token: ", session?.user?.backendToken);
  const disclaimer: string = await fetchDisclaimer(session?.user.id || "", session?.user.backendToken as string);

  // const data = await fetchSPStats(session?.user._id || "", session?.user.backendToken as string);


  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="px-6  pb-0">
        {/* <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Content Section
          </h1>
        </div> */}
      </div>
      {Boolean(disclaimer) ? (
        <div className="p-6 pt-4"> {children}</div>
      ) : (
        <div className="text-center mt-10">
          Please Update your disclaimer in my profile page before posting any
          content
        </div>
      )}
    </div>
  );
}
