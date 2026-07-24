import { options } from "@/app/api/auth/[...nextauth]/options";
import { AdminWalletSPColumns, AdminWalletSPTable } from "@/components";
import { AdminWalletSPColumnTypes } from "@/components/Admin/AdminWalletTableSPPlans/AdminWalletSpColumns";
import ServiceProviderPlanSale from "@/components/Admin/Wallet/ServiceProviderPlanSale";
import { getServerSession } from "next-auth";

async function fetchTradeboxWalletList(token: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/serviceproviderplans`,
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

  const data: AdminWalletSPColumnTypes[] = await fetchTradeboxWalletList(
    session?.user.backendToken!
  );

  const formattedData = data.map((item) => {
    return {
      ...item,
      purchasedBy: item.orderdBy?.name,
      soldByName: item.soldBy?.name,
      createdAt: item.createdAt,
      validity: item.validity,
    };
  });

  // console.log("formatted data",formattedData[0])

  return (
    <div className="px-1 mt-10 ">
      <div className="mt-5">
        <ServiceProviderPlanSale data={formattedData} />
      </div>
      {/* <AdminWalletSPTable columns={AdminWalletSPColumns} data={formattedData} /> */}
    </div>
  );
}
