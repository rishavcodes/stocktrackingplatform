"use client";

import { GSTClaimPopup, GSTDataHistory, Input } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useSession } from "next-auth/react";
import { ChangeEvent, FormEvent, useState } from "react";

export default function TradeBoxPlansGST() {
  const session = useSession();

  const [gstData, setGstData] = useState({
    startDate: "",
    endDate: "",
  });

  const [totalGST, setTotalGST] = useState(0);

  const [totalSPGST, setTotalSPGST] = useState(0);

  function changehandler(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setGstData((prev) => ({ ...prev, [name]: value }));
  }

  async function submitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/calculategst?startDate=${gstData.startDate}&endDate=${gstData.endDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.data?.backendToken}`,
          },
        }
      );

      if (res.status !== 200) {
        return;
      }

      const rawRes = await res.json();

      const { totalGST, totalSPGST } = rawRes.data;

      setTotalGST(totalGST);
      setTotalSPGST(totalSPGST);
    } catch (error) {
      return;
    }
  }

  return (
    <>
      <div className="p-5 mt-10 bg-white dark:bg-black">
        <Toaster />
        <div className="bg-whiteShade dark:bg-blackShade p-5 text-xl">
          Total Non-Claimed Tradebox GST over given time is :{" "}
          <span className="text-green text-2xl">₹{totalGST}</span>
        </div>

        <div className="bg-whiteShade dark:bg-blackShade px-5 pb-5 text-xl">
          Total Non-Claimed Service Provider GST over given time is :{" "}
          <span className="text-green text-2xl">₹{totalSPGST}</span>
        </div>

        <form method="POST" className="mt-5" onSubmit={submitHandler}>
          <div className="flex items-center gap-5">
            <Input
              title={"Start date"}
              type={"date"}
              name={"startDate"}
              onChange={changehandler}
            />
            <Input
              title={"End date"}
              type={"date"}
              name={"endDate"}
              min={
                new Date(gstData.startDate || new Date())
                  .toISOString()
                  .split("T")[0]
              }
              max={new Date().toISOString().split("T")[0]}
              onChange={changehandler}
            />
          </div>
          <div className="flex items-center gap-5">
            <input
              type="submit"
              value={"Calculate"}
              className="mt-5 px-5 py-2 bg-green rounded-md text-black cursor-pointer w-fit"
            />

            {(totalGST !== 0 || totalSPGST !== 0) && (
              <GSTClaimPopup
                amountSP={totalSPGST}
                amountTradebox={totalGST}
                from={gstData.startDate}
                to={gstData.endDate}
              />
            )}
          </div>
        </form>
      </div>

      <GSTDataHistory />
    </>
  );
}
