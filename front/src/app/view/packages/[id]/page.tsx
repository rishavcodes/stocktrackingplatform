"use client";

import { useEffect, useState } from "react";
import PackagePage from "@/components/Packages/PackagePage";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";

export default function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const [id, setId] = useState("");

    // Extract marketplace slug from URL query params
    const marketplaceSlug = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("marketplace") || undefined
        : undefined;

    useEffect(() => {
        (async () => {
            const { id } = await params;
            setId(id);
        })();
    }, [params]);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    async function fetchPackage() {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/viewpackagedetails?id=${id}`
            );

            const json = await res.json();
            setData(json.data);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (id) fetchPackage();
    }, [id]);

    useEnforceSubdomainOwnership(data?.authorData?.id);
    useCanonicalUrl();

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>Package not found</div>;

    return (
        <div className="mt-24">
            <PackagePage data={data} marketplaceSlug={marketplaceSlug} />
        </div>
    );
}
