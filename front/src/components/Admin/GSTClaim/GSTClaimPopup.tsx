import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

type GSTClaimPopupProps = {
  amountSP: number;
  amountTradebox: number;
  from: string;
  to: string;
};

export default function GSTClaimPopup({
  amountSP,
  amountTradebox,
  from,
  to,
}: GSTClaimPopupProps) {
  const { toast } = useToast();
  const session = useSession();

  async function claimGST() {
    const data = { amountSP, amountTradebox, from, to };

    // console.log(from);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/claimgst`,
        {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${session.data?.backendToken}`,
          },
        }
      );

      if (res.status !== 200) {
        toast({
          title: "Failed to claim",
          description: "Failed to claim GST please try again later",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "GST claimed",
        description: "Recorded GST data successfully",
        variant: "default",
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast({
        title: "Failed to claim",
        description: "Failed to claim GST please try again later",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger className="mt-5 px-5 py-2 bg-blue rounded-md text-black cursor-pointer w-fit">
        Claim
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Do you want to claim GST for below details?</DialogTitle>
          <DialogDescription>
            <div className="pt-5"></div>
            <table className="w-full">
              <thead>
                {["Amount", "Start Date", "End Date"].map((item, idx) => (
                  <tr
                    className="md:text-lg text-base text-black dark:text-white"
                    key={item}
                  >
                    <th className="p-3 border">{item}</th>
                    <td className="p-3 border">
                      {idx === 0
                        ? amountTradebox + amountSP
                        : idx === 1
                        ? new Date(from).toLocaleString("en-IN").split(",")[0]
                        : new Date(to).toLocaleString("en-IN").split(",")[0]}
                    </td>
                  </tr>
                ))}
              </thead>
            </table>

            <div
              className="mt-5 px-5 py-2 bg-blue rounded-md text-black cursor-pointer w-fit"
              onClick={() => claimGST()}
            >
              Claim
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
