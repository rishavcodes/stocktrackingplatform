import BellIcon from "@/icons/BellIcon";

type NotificationcardProps = { message: string; createdAt: string };

export default function Notificationcard({
  message,
  createdAt,
}: NotificationcardProps) {
  return (
    <div className="w-full bg-white dark:bg-black flex justify-between p-5">
      <div className="flex items-center gap-3">
        <BellIcon className="w-8 h-8" />
        <div className="dark:text-white/80">{message}</div>
      </div>

      <div className="dark:text-white/80">
        {new Date(createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })}
      </div>
    </div>
  );
}
