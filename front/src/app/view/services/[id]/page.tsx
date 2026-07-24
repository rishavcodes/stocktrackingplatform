"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Footer, ServicePageFund, ServicePageNormal } from "@/components";
import { OurServicesType } from "@/lib/types";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";

type OurServicesTypeWithIndex = {
  [key: string]: string | number | undefined;
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const marketplaceSlug = searchParams.get("marketplace") || undefined;
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const [data, setData] = useState<OurServicesTypeWithIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchServiceData = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/viewpmsservicedetails?id=${id}`
      );

      if (res.status === 200) {
        const response = await res.json();
        setData(response.data);
      } else {
        setError("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchServiceData(id as string);
    }
  }, [id]);

  useEnforceSubdomainOwnership(
    (data?.authorData as { id?: string } | undefined)?.id
  );
  useCanonicalUrl();

  // console.log("serviceData", data)

  // console.log("plan data", data)
  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950 pt-16 md:pt-20">
      <ServicePageNormal data={data} marketplaceSlug={marketplaceSlug} />
    </div>
  );
}
