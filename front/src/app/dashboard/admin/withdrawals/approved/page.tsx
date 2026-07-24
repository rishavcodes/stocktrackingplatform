import { options } from "@/app/api/auth/[...nextauth]/options";
import { WithdrawalDataTable, withdrawalColumns } from "@/components";
import { getServerSession } from "next-auth";

async function fetchWithdrawals(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/requests?type=approved`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      return [];
    }

    const res = await response.json();

    return res.data;
  } catch (error) {
    return [];
  }
}

export default async function page() {
  const session = await getServerSession(options);

  const withdrawalRequests = await fetchWithdrawals(
    session?.user.backendToken!
  );

  return (
    <div>
      <WithdrawalDataTable
        columns={withdrawalColumns}
        data={withdrawalRequests}
        type="approved"
      />
    </div>
  );
}
