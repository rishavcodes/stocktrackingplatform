import { options } from "@/app/api/auth/[...nextauth]/options";
import { PerformancePage } from "@/components";
import { getServerSession } from "next-auth";

export default async function page() {
  const session = await getServerSession(options);

  return <PerformancePage id={session?.user.id!} />;
}
