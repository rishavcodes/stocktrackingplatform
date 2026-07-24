import EventTabs from "@/components/Event/EventTabs/EventTabs";

export default async function layout({
    children,
  }: {
    children: React.ReactNode;
  }) {
  
  
    return (
      <div className="px-5 mt-10">
        {/* <EventTabs
        tabData={[
            {
              title: "Month",
              href: "/view/events/upcomingevents/month",
            },
            {
              title: "Week",
              href: "/view/events/upcomingevents/week",
            },
            {
              title: "Day",
              href: "/view/events/upcomingevents/days",
            },
          ]}
         /> */}
        {children}
      </div>
    );
  }
  