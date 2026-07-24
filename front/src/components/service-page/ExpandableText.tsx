import { useState } from "react";

export default function ExpandableText({
    text,
    maxLength = 100,
}: {
    text: string;
    maxLength?: number;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const truncatedText = text.split(" ").slice(0, maxLength).join(" ");

    return (
        <div>
            <p>{isExpanded ? text : truncatedText}</p>
            {text.split(" ").length > maxLength && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-blue-500"
                >
                    {isExpanded ? "Read Less" : "Read More"}
                </button>
            )}
        </div>
    );
}