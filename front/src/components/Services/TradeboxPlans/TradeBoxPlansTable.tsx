import TickIcon from "@/icons/TickIcon";
import { TradeboxPlansTableConstants } from "./TradeboxPlansTableConstants";
import CrossIconTradeBoxPlans from "@/icons/CrossIconTradeBoxPlans";

export default function TradeBoxPlansTable() {
  return (
    <div>
      <table>
        <thead className="">
          <tr className="text-[#000232] font-medium text-base">
            <th></th>
            <th className="bg-[#C3FFF5] p-5 rounded-tl-2xl">Silver</th>
            <th className="bg-[#8CE8D9] p-5">Gold</th>
            <th className="bg-[#33BFE0] p-5 rounded-tr-2xl">Platinum</th>
          </tr>
        </thead>
        <tbody>
          {TradeboxPlansTableConstants.map((plan, index) => {
            return (
              <tr className={``} key={index}>
                {plan.map((data, idx) => (
                  <td
                    key={idx}
                    className={`sm:p-5 p-2 border-y font-bold ${
                      idx === 0 && "text-black dark:text-white"
                    } ${idx === 1 && "bg-[#C3FFF5] text-[#13584C]"} ${
                      idx === 2 && "bg-[#8CE8D9] text-[#13584C]"
                    } ${idx === 3 && "bg-[#33BFE0] text-[#13584C]"} ${
                      index === 9 && idx === 1 && "rounded-bl-2xl"
                    } ${index === 9 && idx === 3 && "rounded-br-2xl"}`}
                  >
                    {data === "tick" ? (
                      <TickIcon width={25} />
                    ) : data === "cross" ? (
                      <CrossIconTradeBoxPlans width={25} />
                    ) : (
                      data
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
