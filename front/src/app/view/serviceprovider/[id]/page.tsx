"use client"
import RouteToPage from "@/app/RouteToPage";
import React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function Page() {
   const params = useParams(); // Fetch params directly
    const id = params?.id as string;
  return <RouteToPage url={`/view/serviceprovider/${id}/articles`} />;
}
