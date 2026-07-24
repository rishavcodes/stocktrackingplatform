"use client";

import RouteToPage from "@/app/RouteToPage";
import { useParams } from "next/navigation";

export default function ExpertProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = params?.id as string;
  return <RouteToPage url={`/marketplace/${slug}/experts/${id}/articles`} />;
}
