import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  LeadTableFund,
  LeadTableFundColumns,
  LeadTableNormal,
  LeadTableNormalColumns,
} from "@/components";
import { getServerSession } from "next-auth";

async function fetchLeads(id: string, type: string) {
  let fetchType;

  if (type === "PMS" || type === "AIF" || type === "Mutual Funds") {
    fetchType = "fund";
  } else {
    fetchType = "normal";
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getleads/${fetchType}?id=${id}`
    );

    if (res.status !== 200) {
      return [];
    }

    const rawRes = await res.json();

    return rawRes.data;
  } catch (error) {
    return [];
  }
}

export default async function page() {
  const session = await getServerSession(options);
  const data = await fetchLeads(session?.user._id!, session?.user.category!);

  // console.log(data);

  return (
    <div className="mt-10">
      {session?.user.category === "PMS" ||
      session?.user.category === "AIF" ||
      session?.user.category === "Mutual Funds" ? (
        <LeadTableFund columns={LeadTableFundColumns} data={data} />
      ) : (
        <LeadTableNormal columns={LeadTableNormalColumns} data={data} />
      )}
    </div>
  );
}
