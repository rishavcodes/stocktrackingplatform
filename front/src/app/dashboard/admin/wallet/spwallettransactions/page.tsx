import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import RAWalletTransactions from "@/components/Admin/Wallet/RAWalletTransactions"

export type RAWalletTransactionType = {
    serviceProviderId: string;
    paymentId: string;
    orderId: string;
    amount: Number;
    type: string;
    createdAt: string;
    orderdBy: {
        id: string;
        name: string;
        email: string;
    }
}

async function fetchRAWalletTransactions(token: string) {
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/rawallet/transaction-list`,
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

    const data: RAWalletTransactionType[] = await fetchRAWalletTransactions(
        session?.user.backendToken!
    );
    return (
        <div className="px-1 mt-10">
            <div className="mt-5">
                <RAWalletTransactions data={data} />
            </div>
        </div>

    )
}