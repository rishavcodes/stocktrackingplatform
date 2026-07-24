import { MessageTabs, SearchBoxMessaging } from "@/components";
import PrevConvos from "./PrevConvos";

export default function MessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <div className="bg-white dark:bg-black p-5 flex flex-col gap-5">
          <SearchBoxMessaging />
          <PrevConvos />
        </div>
        <div className="bg-white dark:bg-black px-5 w-full flex flex-col gap-5 h-[80vh] relative">
          <MessageTabs />

          {children}
        </div>
      </div>
    </div>
  );
}
