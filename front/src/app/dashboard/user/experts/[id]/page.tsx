"use client";

import RouteToPage from "@/app/RouteToPage";
import { useParams } from "next/navigation";

export default function ExpertDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return <RouteToPage url={`/dashboard/user/experts/${id}/articles`} />;
}
