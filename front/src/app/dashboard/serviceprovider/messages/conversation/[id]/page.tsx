"use client";
import { useState, useEffect } from "react";
import { Conversation } from "@/components";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);
  return <Conversation receiver={id} />;
}
