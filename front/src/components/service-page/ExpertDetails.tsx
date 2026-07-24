export default function ExpertDetails({
    name,
    regNumber,
    email,
    phone,
    address,
    complianceOfficer,
    profileUrl,
}: {
    name: string;
    regNumber?: string;
    email: string;
    phone: string;
    address: string;
    complianceOfficer?: {
        name: string;
        email: string;
        phone: string;
    };
    profileUrl?: string;
}) {
    return (
        <div className="flex flex-col md:flex-row gap-4 my-4">
            <img
                src={profileUrl || "/default-profile.png"}
                className="w-32 h-32 rounded-full"
            />
            <div>
                <h2 className="text-2xl font-semibold">{name}</h2>
                {regNumber && (
                    <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
                        SEBI: {regNumber}
                    </div>
                )}
                <p>Email: {email}</p>
                <p>Phone: {phone}</p>
                <p>Address: {address}</p>
                {complianceOfficer && (
                    <div>
                        <h3>Compliance Officer</h3>
                        <p>Name: {complianceOfficer.name}</p>
                        <p>Email: {complianceOfficer.email}</p>
                    </div>
                )}
            </div>
        </div>
    );
}