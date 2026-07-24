import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "Post New Video",
    href: "/dashboard/serviceprovider/content/videos/postvideo",
  },
  {
    title: "Previous Videos",
    href: "/dashboard/serviceprovider/content/videos/previousvideos",
  },
  {
    title: "Scheduled Videos",
    href: "/dashboard/serviceprovider/content/videos/scheduledvideos",
  },
];

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceProviderTabs tabData={tabData} marginTop="mt-0" />
      <div className="mt-5">{children}</div>
    </>
  );
}
