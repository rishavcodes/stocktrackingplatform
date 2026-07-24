import { options } from "@/app/api/auth/[...nextauth]/options";
import { AdminWalletColumns } from "@/components";
import { AdminWalletTable } from "@/components/Admin/AdminWalletTableTradeboxPlans/AdminWalletTable";
import { AdminWalletColumnTypes } from "@/components/Admin/AdminWalletTableTradeboxPlans/AdminWalletColumns";
import { getServerSession } from "next-auth";

type TradeboxPlansDataProps = {
  _id: string;
  orderdBy?: { name: string; email: string };
  purchasedBy?: string;
  email?: string;
  serviceId?: { title: string };
  serviceName?: string;
  plan: string;
  paymentId: string;
  orderId: string;
  paymentMethod: string;
  amount: number;
  gst: number;
  total: number;
  planName: string;
  duration: number;
  createdAt: string;
  status: string;
}

async function fetchTradeboxWalletList(token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/tradeboxplans`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
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

  const data: TradeboxPlansDataProps[] = await fetchTradeboxWalletList(
    session?.user.backendToken!
  );

  const formattedData = data.map((item) => {
    return {
      ...item,
      purchasedBy: item.orderdBy?.name,
      email: item.orderdBy?.email,
      serviceName: item?.planName,
      plan: item?.plan,
      status: item.status,
      amount: item.amount,
      GST: item.gst,
      total: item.total,
      createdAt: item.createdAt,
    };
  });

  console.log("tradeboxplans: ", formattedData[0])

  return (
    <div className="px-1 mt-10">
      <div className="mt-5"></div>
      <AdminWalletTable
        data={formattedData}
      />
    </div>
  );
}
