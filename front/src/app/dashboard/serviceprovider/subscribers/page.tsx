import { options } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import SubscribersClient from "@/components/Wallet/SubscribersClient";

export type transactionsType = {
  _id: string;
  orderdBy: {
    name: string;
    id: string;
    email: string;
  };
  soldBy: {
    name: string;
    id: string;
  };
  serviceName: string;
  amount: number;
  subtotal: number;
  gst: number;
  total: number;
  paymentId: string;
  orderId: string;
  paymentMethod: 'Manual' | 'Razorpay' | 'Wallet';
  createdAt: Date;
  updatedAt: Date;
  invoiceLink: string;
  signedDocumentUrl: string;
  paymentProof: string;
  verifiedByRa: boolean;
  paymentStatus?: "pending" | "verified" | "rejected";
  isRenewal?: boolean;
  validity: number;
  kycDetails?: {
    panUrl?: string;
    aadhaarUrl?: string;
    panNumber: string;
    dob: string;
    kycDate?: Date;
  };
  type: 'service' | 'product' | 'subscription' | 'event' | 'transaction';
  isExpired: boolean;
  number: string;
  city?: string | null;
  state?: string | null;
  gender?: string | null;
  aadhaarLast4?: string | null;
  eventMode?: 'online' | 'offline';
  eventSchedule?: Date | string;
};

async function fetchTransactions(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/transactions?id=${id}`
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

export default async function MyWallet() {
  const session = await getServerSession(options);

  const transactions: transactionsType[] = await fetchTransactions(`${session?.user?.id}`);

  // The /transactions feed is shared and also includes the provider's own
  // withdrawal payouts, which have no `orderdBy` and render as blank
  // "UNDEFINED DAYS" phantom rows. The Subscribers list must only show
  // actual subscribers (orders + event registrations).
  const subscribers = (transactions || []).filter((t) => t?.orderdBy?.id);

  return <SubscribersClient transactions={subscribers} />;
}
