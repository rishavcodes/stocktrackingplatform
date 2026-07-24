"use client";
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
  return (
    <iframe
      className="w-full h-screen"
      src={`https://www.youtube.com/embed/${id}`}
      // allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    ></iframe>
  );
}
