"use client"
import { PerformancePage } from "@/components";
import { useEffect, useState } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");

   useEffect(() => {
     const getId = async () => {
       const { id } = await params;
       setId(id);
     };
     getId();
   }, [params]);

  return <PerformancePage id={id} />;
}
