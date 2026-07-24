import { EventType } from "@/app/dashboard/user/events/page";

type Props = {
    event: EventType;
};

export default function EventCard({ event }: Props) {
    const isPastEvent = new Date(event.schedule) < new Date();

    return (
        <div className="rounded-xl border bg-white dark:bg-black overflow-hidden hover:shadow-md transition">
            {event.image && (
                <img
                    src={event.image}
                    alt={event.title}
                    className="h-40 w-full object-cover"
                />
            )}

            <div className="p-4 space-y-2">
                <h3 className="font-semibold text-lg line-clamp-1">
                    {event.title}
                </h3>

                <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                </p>

                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                        {new Date(event.schedule).toLocaleString()}
                    </span>
                    <span className="capitalize">
                        {event.eventType}
                    </span>
                </div>

                {event.link && !isPastEvent && (
                    <a
                        href={event.link}
                        target="_blank"
                        className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline"
                    >
                        Join Event →
                    </a>
                )}
                {isPastEvent && (
                    <span className="inline-block mt-3 text-xs font-medium text-gray-400">
                        Event ended
                    </span>
                )}
            </div>
        </div>
    );
}
