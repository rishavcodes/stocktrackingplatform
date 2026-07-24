import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import InfoIcon from "@/icons/InfoIcon";
import fetcher from "@/lib/data/setup";
import Link from "next/link";
import useSWR from "swr";

type PaymentDetailsProps = {
  _id?: string;
  bankName: string;
  name: string;
  accNumber: string;
  ifsc: string;
  cheque: string;
  upi: string;
  [key: string]: string | undefined;
};

export default function PaymentDetails({ id }: { id: string }) {
  const { data } = useSWR<{ data: PaymentDetailsProps }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/paymentdetails?id=${id}`,
    fetcher
  );

  const titleArr = [
    "Bank Name",
    "Beneficiary name",
    "Account Number",
    "IFSC Code",
    "UPI ID",
    "Cheque",
  ];

  return (
    <>
      <Toaster />
      <Dialog>
        <DialogTrigger>
          <InfoIcon className="w-5 h-5" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <div className="pt-5"></div>
            <table className="">
              {Object.keys(data?.data || {}).map((item, idx) => {
                if (item === "_id" || item === "__v") {
                  return;
                }

                if (item === "cheque") {
                  return (
                    <tr key={item} className="border p-5">
                      <th className="border-r p-5">Cheque</th>
                      <td className="p-5 flex flex-col gap-5">
                        <iframe
                          src={data?.data[item]}
                          className="w-full aspect-video"
                        ></iframe>
                        <Link
                          className="bg-green px-5 py-3 w-fit text-black"
                          href={data?.data[item]!}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          View Full
                        </Link>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item} className="border p-5">
                    <th className="border-r p-5">{titleArr[idx - 1]}</th>
                    <td className="p-5">{data?.data[item]}</td>
                  </tr>
                );
              })}
            </table>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
