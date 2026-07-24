"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

export default function Page() {
  const params = useParams<{ id: string[] }>(); // Unwrap params using useParams()
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    if (params?.id) {
      const url = params.id.join("/");
      setPdfUrl(`https://${url}`);
    }
  }, [params]);

  const docs = [
    {
      uri: pdfUrl, // Replace with your actual file path
      fileType: "docx",
    },
  ];

  return (
    <div className="h-screen mt-10">
      <DocViewer
        documents={docs}
        pluginRenderers={DocViewerRenderers}
      />
    </div>
  );
}
