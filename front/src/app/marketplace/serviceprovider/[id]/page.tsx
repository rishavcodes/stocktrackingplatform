"use client"
import RouteToPage from "@/app/RouteToPage";
import React from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function Page() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const marketplaceId = searchParams.get("marketplaceId");
  const url = marketplaceId
    ? `/marketplace/serviceprovider/${id}/articles?marketplaceId=${marketplaceId}`
    : `/marketplace/serviceprovider/${id}/articles`;
  return <RouteToPage url={url} />;
}
