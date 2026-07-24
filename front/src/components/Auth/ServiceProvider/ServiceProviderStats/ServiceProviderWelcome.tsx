import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import ServiceProviderStatCards from "./ServiceProviderStatCards";

export default async function ServiceProviderWelcome() {
  const session = await getServerSession(options);

  return (
    <div className="ss:mt-10 mt-5 flex flex-col gap-5 ss:w-full w-[90%] mx-auto dark:bg-blackShade">
      <h1 className="font-normal ss:text-[40px] text-[30px] ss:leading-9 leading-7 dark:text-white/70">
        Welcome, {session?.user.RegName}
      </h1>
    </div>
  );
}
