"use client"
import RouteToPage from "@/app/RouteToPage";
import { useEffect, useState } from "react";
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
   const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { slug } = await params;
      setSlug(slug);
    };
    getId();
  }, [params]);
  return <RouteToPage url={`/market-watch/${slug}/articles`} />;
}
