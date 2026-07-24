export default function FeaturesList({
    features,
    title,
}: {
    features: string[];
    title: string;
}) {
    return (
        <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    );
}