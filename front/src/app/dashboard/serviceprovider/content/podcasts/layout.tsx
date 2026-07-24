import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "Post New Podcast",
    href: "/dashboard/serviceprovider/content/podcasts/postpodcast",
  },
  {
    title: "Previous Podcast",
    href: "/dashboard/serviceprovider/content/podcasts/previouspodcasts",
  },
  {
    title: "Scheduled Podcasts",
    href: "/dashboard/serviceprovider/content/podcasts/scheduledpodcasts",
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
