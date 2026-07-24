import Link from "next/link";

type ServiceProviderStatCardsProps = {
  data: Record<string, number>;
};

const sections = [
  {
    title: "Services",
    items: ["Plans", "Subscribers", "Leads"],
  },
  {
    title: "Recommendations",
    items: ["Total", "Open", "Close"],
  },
  {
    title: "Content",
    items: ["Articles", "Videos", "Podcasts"],
  },
  {
    title: "Events",
    items: ["Upcoming Events", "Past Events"],
  },
];



export default function ServiceProviderStatCards({
  data,
}: ServiceProviderStatCardsProps) {
  return (
    <div className="w-[95%] mx-auto flex flex-col gap-8 pb-10">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="text-xl font-semibold dark:text-white/80 mb-4">
            {section.title}
          </div>
          <div className="grid sm:grid-cols-3 xs:grid-cols-2 gap-5">
            {section.items.map((item) => (
              <div
                key={item}
                className="bg-white dark:bg-black p-5 rounded-lg shadow-md"
              >
                <div className="dark:text-white/70 text-[15px] font-medium">
                  {item}
                </div>
                <div className="text-blue text-[30px] font-semibold">
                  {data[item.replace(/ /g, "").toLowerCase()] || 0}
                  {item.includes("Return") ? "%" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
