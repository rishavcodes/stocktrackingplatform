"use client";
import { useState, useEffect } from "react";
import { ScoreCardTypesEnum, useScoreCardData } from "@/components";
import { useSession } from "next-auth/react";
import { MyRecommendationTable } from "@/components";

export default function Recommendations({ params }: { params: Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");
        
          useEffect(() => {
            const getId = async () => {
              const { id } = await params;
              setId(id);
            };
            getId();
          }, [params]);
  const { openTrades, closedTrades, ScoreCardcolumns, totalOpenTrades } =
    useScoreCardData(
      id,
      "",
      ScoreCardTypesEnum.ServiceProviderDashboard
    );

  return (
    <div className="mt-5 flex flex-col gap-10 pb-20">
      <div className="flex flex-col gap-2">
        <div>Open Trades</div>
        <MyRecommendationTable
          //columns={ScoreCardcolumns}
          data={openTrades}
          type="open"
          isDashboard={true}
          totalOpenTrades={totalOpenTrades}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div>Closed Trades</div>
        <MyRecommendationTable
          //columns={ScoreCardcolumns}
          data={closedTrades}
          type={"closed"}
        />
      </div>
    </div>
  );
}
