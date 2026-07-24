import ActionButtons from "@/app/view/services/ActionButtons";
import InfoCard from "@/app/view/services/InfoCard";
import { OurServicesType } from "@/lib/types";

type OurServicesTypeWithIndex = OurServicesType & {
  [key: string]: string | number | undefined;
};

export default function ServicePageFund({
  data,
}: {
  data: any;
}) {
  const returns = ["1 Month", "6 Months", "1 Year", "3 Years", "5 Years"];

  const infoCardsData = [
    {
      key: "NoOfClients",
      title: "No. Of Clients",
      bgColor: "bg-green/20 dark:bg-green/30",
    },
    {
      key: "inceptionDate",
      title: "Inception Date",
      bgColor: "bg-blue/20 dark:bg-blue/30",
    },
    { key: "AsOn", title: "As On", bgColor: "bg-green/20 dark:bg-green/30" },
    { key: "AUM", title: "AUM (Cr.)", bgColor: "bg-blue/20 dark:bg-blue/30" },
  ];

  return (
    <div className="text-center flex flex-col gap-3 justify-start mt-20">
      {" "}
      <div className="text-indigo dark:text-blue font-semibold text-[40px]">
        {data?.title}
      </div>
      <div className="bg-indigo rounded-2xl px-10 py-3 w-fit text-white mx-auto font-semibold">
        Fund manager <br />
        {data?.Fundmanager}
      </div>
      <ActionButtons
        category={data.authorData.type}
        authorid={data.authorData.id}
        planName={data.title}
        authorName={data.authorData.name}
        authorEmail={data.authorData.email}
        serviceId={data._id}
        description={data.description}
        price={data.price!}
        authorLogo={data.authorData.authorImage}
        sellerName={data.authorData.name}
        sellerId={data.authorData.id}
        validity={data.validity}
        transactionType={"service"}
      />
      <div className="text-indigo dark:text-blue">{data.description}</div>
      <div className="flex justify-center mt-10 gap-10 items-center">
        {infoCardsData.map(
          ({ key, title, bgColor }) =>
            data[key] && (
              <InfoCard
                key={key}
                title={title}
                value={
                  key === "inceptionDate" || key === "AsOn"
                    ? new Date(data[key]!).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })
                    : data[key]
                }
                bgColor={bgColor}
              />
            )
        )}
      </div>
      <div className="my-20">
        <div className=" text-indigo font-semibold text-[30px] dark:text-blue/90">
          Investment Approach Trailing Returns %
        </div>

        <div className="border border-darkGrey mt-10 mx-auto rounded-2xl w-fit">
          <table>
            <thead className="">
              <tr>
                <th className="px-20 py-3 bg-blue/30 border-r rounded-tl-2xl border-darkGrey">
                  Time Period
                </th>
                <th className="px-20 py-3 rounded-tr-2xl bg-blue/30">
                  Investment Approach
                </th>
              </tr>
            </thead>
            <tbody>
              {returns.map((returnItem, index) => (
                <tr key={index}>
                  <td className="border-t border-r border-darkGrey py-3 px-40">
                    {returnItem}
                  </td>
                  <td className="border-t border-darkGrey py-3 px-40">
                    {data.returnsByTime && data.returnsByTime[index] !== 0
                      ? data.returnsByTime[index] + "%"
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 w-[80%] mx-auto text-center text-darkGrey dark:text-white/70">
          * Returns are as on 31st October 2023, Returns over a I year period
          are annualized * Returns are calculated using the Time Weighted Rate
          of Return (TWRR) method and as provided by the respective AMCs- *ND
          (No Data) , * NA(Not Applicable) * Returns of the respective Benchmark
          Indices used are tabulated above. Benchmark(s) given are as per SEBI
          circular no. SEBI/HO/IMD/IMD-PoD-2/P/CIR/2022/172 dated December 1 6,
          2022 and the APMI circular no. APMl/2022-23/02 dated 23rd March,2023
          and Revised Annexure-I
        </div>
      </div>
    </div>
  );
}
