"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import InfoIcon from "@/icons/InfoIcon";
import TradeExitConfirmationBox from "../Table/TradeExitConfirmationBox";
import TradeDeleteConfirmationBox from "../Table/TradeDeleteConfirmationBox";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

type ScoreCardDrawerTypes = {
  _id: string;
  exchange: string;
  scriptname: string;
  entryType: string;
  target: number;
  stoploss: number;
  validity: string;
  pnl?: number | string;
  pnlpercentage?: string;
  status?: string;
  result?: string;
  istriggered?: string;
  rateRange?: string;
  exitRate?: string;
  ltp?: string;
  tableType: string;
  createdAt: string;
  riskRewardRatio: string;
  sharedWith?: string[];
  shareWithPlans?: string[];
  isDashboard: Boolean;
};

type ResultType = "tp" | "sl" | "manual" | "timeout";

export default function ScoreCardDrawer({
  _id,
  exchange,
  scriptname,
  entryType,
  target,
  stoploss,
  validity,
  pnl,
  pnlpercentage,
  status,
  result,
  istriggered,
  rateRange,
  exitRate,
  ltp,
  tableType,
  createdAt,
  riskRewardRatio,
  sharedWith,
  isDashboard,
}: ScoreCardDrawerTypes) {
  const resultFullNames = {
    tp: "TP Hit",
    sl: "Stoploss Hit",
    manual: "Manually exited",
    timeout: "Expired",
  };

  const { data } = useSWR<{ data: { _id: string; title: string }[] }>(
    sharedWith?.includes("subscribers")
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getsharedwithplans?id=${_id}`
      : null,
    fetcher
  );

  return (
    <Drawer>
      <DrawerTrigger>
        <InfoIcon className="w-5 h-5" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {scriptname} - {exchange}
          </DrawerTitle>

          <DrawerDescription className="flex flex-col mt-5 text-[15px] gap-5">
            <div>Entry Type : {entryType}</div>
            <div>Target : {target}</div>
            <div>StopLoss : {stoploss}</div>
            <div>Original Validity : {validity}</div>
            {result !== "open" && (
              <div>Result : {resultFullNames[result as ResultType]}</div>
            )}

            <div>
              Created At :{" "}
              {`${new Date(createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}`}
            </div>

            <div>Risk to Reward Ratio : {riskRewardRatio}</div>

            {sharedWith?.includes("subscribers") && (
              <div className="flex items-center gap-5">
                {data?.data.map((plan) => (
                  <div
                    key={plan._id}
                    className="bg-green w-fit text-black px-3 py-2 rounded-md"
                  >
                    {plan.title}
                  </div>
                ))}
              </div>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          {tableType === "open" && isDashboard && (
            <div className="flex gap-2">
              <TradeExitConfirmationBox
                id={_id}
                name={scriptname}
                pnl={pnl as string}
                pnlpercentage={pnlpercentage as string}
                ltp={Number(ltp)}
              />
              <TradeDeleteConfirmationBox id={_id} name={scriptname} />
            </div>
          )}

          <DrawerClose>
            {/* <Button variant="outline">Cancel</Button> */}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
